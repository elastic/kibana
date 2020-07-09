/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import Boom from 'boom';
import numeral from '@elastic/numeral';
import { LegacyAPICaller, SavedObjectsClientContract } from 'kibana/server';
import moment from 'moment';
import { IndexPatternAttributes } from 'src/plugins/data/server';
import { merge } from 'lodash';
import { AnalysisLimits, CombinedJobWithStats } from '../../../common/types/anomaly_detection_jobs';
import { MlInfoResponse } from '../../../common/types/ml_server_info';
import {
  KibanaObjects,
  ModuleDataFeed,
  ModuleJob,
  Module,
  JobOverride,
  DatafeedOverride,
  GeneralJobsOverride,
  DatafeedResponse,
  JobResponse,
  KibanaObjectResponse,
  DataRecognizerConfigResponse,
  GeneralDatafeedsOverride,
  JobSpecificOverride,
  isGeneralJobOverride,
} from '../../../common/types/modules';
import {
  getLatestDataOrBucketTimestamp,
  prefixDatafeedId,
  splitIndexPatternNames,
} from '../../../common/util/job_utils';
import { mlLog } from '../../client/log';
import { calculateModelMemoryLimitProvider } from '../calculate_model_memory_limit';
import { fieldsServiceProvider } from '../fields_service';
import { jobServiceProvider } from '../job_service';
import { resultsServiceProvider } from '../results_service';
import { JobExistResult, JobStat } from '../../../common/types/data_recognizer';

const ML_DIR = 'ml';
const KIBANA_DIR = 'kibana';
const INDEX_PATTERN_ID = 'INDEX_PATTERN_ID';
const INDEX_PATTERN_NAME = 'INDEX_PATTERN_NAME';
export const SAVED_OBJECT_TYPES = {
  DASHBOARD: 'dashboard',
  SEARCH: 'search',
  VISUALIZATION: 'visualization',
};

interface RawModuleConfig {
  id: string;
  title: string;
  description: string;
  type: string;
  logoFile: string;
  defaultIndexPattern: string;
  query: any;
  jobs: Array<{ file: string; id: string }>;
  datafeeds: Array<{ file: string; job_id: string; id: string }>;
  kibana: {
    search: Array<{ file: string; id: string }>;
    visualization: Array<{ file: string; id: string }>;
    dashboard: Array<{ file: string; id: string }>;
  };
}

interface MlJobStats {
  jobs: CombinedJobWithStats[];
}

interface Config {
  dirName: any;
  json: RawModuleConfig;
}

export interface RecognizeResult {
  id: string;
  title: string;
  query: any;
  description: string;
  logo: { icon: string } | null;
}

interface ObjectExistResult {
  id: string;
  type: string;
}

interface ObjectExistResponse {
  id: string;
  type: string;
  exists: boolean;
  savedObject?: any;
}

interface SaveResults {
  jobs: JobResponse[];
  datafeeds: DatafeedResponse[];
  savedObjects: KibanaObjectResponse[];
}

export class DataRecognizer {
  modulesDir = `${__dirname}/modules`;
  indexPatternName: string = '';
  indexPatternId: string | undefined = undefined;
  /**
   * List of the module jobs that require model memory estimation
   */
  jobsForModelMemoryEstimation: Array<{ job: ModuleJob; query: any }> = [];

  constructor(
    private callAsCurrentUser: LegacyAPICaller,
    private savedObjectsClient: SavedObjectsClientContract
  ) {}

  // list all directories under the given directory
  async listDirs(dirName: string): Promise<string[]> {
    const dirs: string[] = [];
    return new Promise((resolve, reject) => {
      fs.readdir(dirName, (err, fileNames) => {
        if (err) {
          reject(err);
        }
        fileNames.forEach((fileName) => {
          const path = `${dirName}/${fileName}`;
          if (fs.lstatSync(path).isDirectory()) {
            dirs.push(fileName);
          }
        });
        resolve(dirs);
      });
    });
  }

  async readFile(fileName: string): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.readFile(fileName, 'utf-8', (err, content) => {
        if (err) {
          reject(err);
        } else {
          resolve(content);
        }
      });
    });
  }

  async loadManifestFiles(): Promise<Config[]> {
    const configs: Config[] = [];
    const dirs = await this.listDirs(this.modulesDir);
    await Promise.all(
      dirs.map(async (dir) => {
        let file: string | undefined;
        try {
          file = await this.readFile(`${this.modulesDir}/${dir}/manifest.json`);
        } catch (error) {
          mlLog.warn(`Data recognizer skipping folder ${dir} as manifest.json cannot be read`);
        }

        if (file !== undefined) {
          try {
            configs.push({
              dirName: dir,
              json: JSON.parse(file),
            });
          } catch (error) {
            mlLog.warn(`Data recognizer error parsing ${dir}/manifest.json. ${error}`);
          }
        }
      })
    );

    return configs;
  }

  // get the manifest.json file for a specified id, e.g. "nginx"
  async getManifestFile(id: string) {
    const manifestFiles = await this.loadManifestFiles();
    return manifestFiles.find((i) => i.json.id === id);
  }

  // called externally by an endpoint
  async findMatches(indexPattern: string): Promise<RecognizeResult[]> {
    const manifestFiles = await this.loadManifestFiles();
    const results: RecognizeResult[] = [];

    await Promise.all(
      manifestFiles.map(async (i) => {
        const moduleConfig = i.json;
        let match = false;
        try {
          match = await this.searchForFields(moduleConfig, indexPattern);
        } catch (error) {
          mlLog.warn(
            `Data recognizer error running query defined for module ${moduleConfig.id}. ${error}`
          );
        }

        if (match === true) {
          let logo = null;
          if (moduleConfig.logoFile) {
            try {
              logo = await this.readFile(
                `${this.modulesDir}/${i.dirName}/${moduleConfig.logoFile}`
              );
              logo = JSON.parse(logo);
            } catch (e) {
              logo = null;
            }
          }
          results.push({
            id: moduleConfig.id,
            title: moduleConfig.title,
            query: moduleConfig.query,
            description: moduleConfig.description,
            logo,
          });
        }
      })
    );

    return results;
  }

  async searchForFields(moduleConfig: RawModuleConfig, indexPattern: string) {
    if (moduleConfig.query === undefined) {
      return false;
    }

    const index = indexPattern;
    const size = 0;
    const body = {
      query: moduleConfig.query,
    };

    const resp = await this.callAsCurrentUser('search', {
      index,
      rest_total_hits_as_int: true,
      size,
      body,
    });

    return resp.hits.total !== 0;
  }

  async listModules() {
    const manifestFiles = await this.loadManifestFiles();
    const ids = manifestFiles.map(({ json }) => json.id).sort((a, b) => a.localeCompare(b)); // sort as json files are read from disk and could be in any order.

    const modules = [];
    for (let i = 0; i < ids.length; i++) {
      const module = await this.getModule(ids[i]);
      modules.push(module);
    }
    return modules;
  }

  // called externally by an endpoint
  // supplying an optional prefix will add the prefix
  // to the job and datafeed configs
  async getModule(id: string, prefix = ''): Promise<Module> {
    let manifestJSON: RawModuleConfig | null = null;
    let dirName: string | null = null;

    const manifestFile = await this.getManifestFile(id);
    if (manifestFile !== undefined) {
      manifestJSON = manifestFile.json;
      dirName = manifestFile.dirName;
    } else {
      throw Boom.notFound(`Module with the id "${id}" not found`);
    }

    const jobs: ModuleJob[] = [];
    const datafeeds: ModuleDataFeed[] = [];
    const kibana: KibanaObjects = {};
    // load all of the job configs
    await Promise.all(
      manifestJSON.jobs.map(async (job) => {
        try {
          const jobConfig = await this.readFile(
            `${this.modulesDir}/${dirName}/${ML_DIR}/${job.file}`
          );
          // use the file name for the id
          jobs.push({
            id: `${prefix}${job.id}`,
            config: JSON.parse(jobConfig),
          });
        } catch (error) {
          mlLog.warn(
            `Data recognizer error loading config for job ${job.id} for module ${id}. ${error}`
          );
        }
      })
    );

    // load all of the datafeed configs
    await Promise.all(
      manifestJSON.datafeeds.map(async (datafeed) => {
        try {
          const datafeedConfig = await this.readFile(
            `${this.modulesDir}/${dirName}/${ML_DIR}/${datafeed.file}`
          );
          const config = JSON.parse(datafeedConfig);
          // use the job id from the manifestFile
          config.job_id = `${prefix}${datafeed.job_id}`;

          datafeeds.push({
            id: prefixDatafeedId(datafeed.id, prefix),
            config,
          });
        } catch (error) {
          mlLog.warn(
            `Data recognizer error loading config for datafeed ${datafeed.id} for module ${id}. ${error}`
          );
        }
      })
    );

    // load all of the kibana saved objects
    if (manifestJSON.kibana !== undefined) {
      const kKeys = Object.keys(manifestJSON.kibana) as Array<keyof RawModuleConfig['kibana']>;
      await Promise.all(
        kKeys.map(async (key) => {
          kibana[key] = [];
          await Promise.all(
            manifestJSON!.kibana[key].map(async (obj) => {
              try {
                const kConfig = await this.readFile(
                  `${this.modulesDir}/${dirName}/${KIBANA_DIR}/${key}/${obj.file}`
                );
                // use the file name for the id
                const kId = obj.file.replace('.json', '');
                const config = JSON.parse(kConfig);
                kibana[key]!.push({
                  id: kId,
                  title: config.title,
                  config,
                });
              } catch (error) {
                mlLog.warn(
                  `Data recognizer error loading config for ${key} ${obj.id} for module ${id}. ${error}`
                );
              }
            })
          );
        })
      );
    }

    return {
      ...manifestJSON,
      jobs,
      datafeeds,
      kibana,
    };
  }

  // called externally by an endpoint
  // takes a module config id, an optional jobPrefix and the request object
  // creates all of the jobs, datafeeds and savedObjects  listed in the module config.
  // if any of the savedObjects already exist, they will not be overwritten.
  async setup(
    moduleId: string,
    jobPrefix?: string,
    groups?: string[],
    indexPatternName?: string,
    query?: any,
    useDedicatedIndex?: boolean,
    startDatafeed?: boolean,
    start?: number,
    end?: number,
    jobOverrides?: JobOverride | JobOverride[],
    datafeedOverrides?: DatafeedOverride | DatafeedOverride[],
    estimateModelMemory: boolean = true
  ) {
    // load the config from disk
    const moduleConfig = await this.getModule(moduleId, jobPrefix);

    if (indexPatternName === undefined && moduleConfig.defaultIndexPattern === undefined) {
      throw Boom.badRequest(
        `No index pattern configured in "${moduleId}" configuration file and no index pattern passed to the endpoint`
      );
    }

    this.indexPatternName =
      indexPatternName === undefined ? moduleConfig.defaultIndexPattern : indexPatternName;
    this.indexPatternId = await this.getIndexPatternId(this.indexPatternName);

    // the module's jobs contain custom URLs which require an index patten id
    // but there is no corresponding index pattern, throw an error
    if (this.indexPatternId === undefined && this.doJobUrlsContainIndexPatternId(moduleConfig)) {
      throw Boom.badRequest(
        `Module's jobs contain custom URLs which require a kibana index pattern (${this.indexPatternName}) which cannot be found.`
      );
    }

    // the module's saved objects require an index patten id
    // but there is no corresponding index pattern, throw an error
    if (
      this.indexPatternId === undefined &&
      this.doSavedObjectsContainIndexPatternId(moduleConfig)
    ) {
      throw Boom.badRequest(
        `Module's saved objects contain custom URLs which require a kibana index pattern (${this.indexPatternName}) which cannot be found.`
      );
    }

    // create an empty results object
    const results = this.createResultsTemplate(moduleConfig);
    const saveResults: SaveResults = {
      jobs: [] as JobResponse[],
      datafeeds: [] as DatafeedResponse[],
      savedObjects: [] as KibanaObjectResponse[],
    };

    this.jobsForModelMemoryEstimation = moduleConfig.jobs.map((job) => ({
      job,
      query: moduleConfig.datafeeds.find((d) => d.config.job_id === job.id)?.config.query ?? null,
    }));

    this.applyJobConfigOverrides(moduleConfig, jobOverrides, jobPrefix);
    this.applyDatafeedConfigOverrides(moduleConfig, datafeedOverrides, jobPrefix);
    this.updateDatafeedIndices(moduleConfig);
    this.updateJobUrlIndexPatterns(moduleConfig);
    await this.updateModelMemoryLimits(moduleConfig, estimateModelMemory, start, end);

    // create the jobs
    if (moduleConfig.jobs && moduleConfig.jobs.length) {
      if (Array.isArray(groups)) {
        // update groups list for each job
        moduleConfig.jobs.forEach((job) => (job.config.groups = groups));
      }

      // Set the results_index_name property for each job if useDedicatedIndex is true
      if (useDedicatedIndex === true) {
        moduleConfig.jobs.forEach((job) => (job.config.results_index_name = job.id));
      }
      saveResults.jobs = await this.saveJobs(moduleConfig.jobs);
    }

    // create the datafeeds
    if (moduleConfig.datafeeds && moduleConfig.datafeeds.length) {
      if (typeof query === 'object' && query !== null) {
        moduleConfig.datafeeds.forEach((df) => {
          df.config.query = query;
        });
      }
      saveResults.datafeeds = await this.saveDatafeeds(moduleConfig.datafeeds);

      if (startDatafeed) {
        const savedDatafeeds = moduleConfig.datafeeds.filter((df) => {
          const datafeedResult = saveResults.datafeeds.find((d) => d.id === df.id);
          return datafeedResult !== undefined && datafeedResult.success === true;
        });

        const startResults = await this.startDatafeeds(savedDatafeeds, start, end);
        saveResults.datafeeds.forEach((df) => {
          const startedDatafeed = startResults[df.id];
          if (startedDatafeed !== undefined) {
            df.started = startedDatafeed.started;
            if (startedDatafeed.error !== undefined) {
              df.error = startedDatafeed.error;
            }
          }
        });
      }
    }

    // create the savedObjects
    if (moduleConfig.kibana) {
      // update the saved objects with the index pattern id
      this.updateSavedObjectIndexPatterns(moduleConfig);

      const savedObjects = await this.createSavedObjectsToSave(moduleConfig);
      // update the exists flag in the results
      this.updateKibanaResults(results.kibana, savedObjects);
      // create the savedObjects
      saveResults.savedObjects = await this.saveKibanaObjects(savedObjects);
    }
    // merge all the save results
    this.updateResults(results, saveResults);
    return results;
  }

  async dataRecognizerJobsExist(moduleId: string): Promise<JobExistResult> {
    const results = {} as JobExistResult;

    // Load the module with the specified ID and check if the jobs
    // in the module have been created.
    const module = await this.getModule(moduleId);
    if (module && module.jobs) {
      // Add a wildcard at the front of each of the job IDs in the module,
      // as a prefix may have been supplied when creating the jobs in the module.
      const jobIds = module.jobs.map((job) => `*${job.id}`);
      const { jobsExist } = jobServiceProvider(this.callAsCurrentUser);
      const jobInfo = await jobsExist(jobIds);

      // Check if the value for any of the jobs is false.
      const doJobsExist = Object.values(jobInfo).includes(false) === false;
      results.jobsExist = doJobsExist;

      if (doJobsExist === true) {
        // Get the IDs of the jobs created from the module, and their earliest / latest timestamps.
        const jobStats: MlJobStats = await this.callAsCurrentUser('ml.jobStats', { jobId: jobIds });
        const jobStatsJobs: JobStat[] = [];
        if (jobStats.jobs && jobStats.jobs.length > 0) {
          const foundJobIds = jobStats.jobs.map((job) => job.job_id);
          const { getLatestBucketTimestampByJob } = resultsServiceProvider(this.callAsCurrentUser);
          const latestBucketTimestampsByJob = await getLatestBucketTimestampByJob(foundJobIds);

          jobStats.jobs.forEach((job) => {
            const jobStat = {
              id: job.job_id,
            } as JobStat;

            if (job.data_counts) {
              jobStat.earliestTimestampMs = job.data_counts.earliest_record_timestamp;
              jobStat.latestTimestampMs = job.data_counts.latest_record_timestamp;
              jobStat.latestResultsTimestampMs = getLatestDataOrBucketTimestamp(
                jobStat.latestTimestampMs,
                latestBucketTimestampsByJob[job.job_id] as number
              );
            }
            jobStatsJobs.push(jobStat);
          });
        }
        results.jobs = jobStatsJobs;
      }
    }

    return results;
  }

  async loadIndexPatterns() {
    return await this.savedObjectsClient.find<IndexPatternAttributes>({
      type: 'index-pattern',
      perPage: 1000,
    });
  }

  // returns a id based on an index pattern name
  async getIndexPatternId(name: string) {
    try {
      const indexPatterns = await this.loadIndexPatterns();
      if (indexPatterns === undefined || indexPatterns.saved_objects === undefined) {
        return;
      }
      const ip = indexPatterns.saved_objects.find((i) => i.attributes.title === name);
      return ip !== undefined ? ip.id : undefined;
    } catch (error) {
      mlLog.warn(`Error loading index patterns, ${error}`);
      return;
    }
  }

  // create a list of objects which are used to save the savedObjects.
  // each has an exists flag and those which do not already exist
  // contain a savedObject object which is sent to the server to save
  async createSavedObjectsToSave(moduleConfig: Module) {
    // first check if the saved objects already exist.
    const savedObjectExistResults = await this.checkIfSavedObjectsExist(moduleConfig.kibana);
    // loop through the kibanaSaveResults and update
    Object.keys(moduleConfig.kibana).forEach((type) => {
      // type e.g. dashboard, search ,visualization
      moduleConfig.kibana[type]!.forEach((configItem) => {
        const existsResult = savedObjectExistResults.find((o) => o.id === configItem.id);
        if (existsResult !== undefined) {
          configItem.exists = existsResult.exists;
          if (existsResult.exists === false) {
            // if this object doesn't already exist, create the savedObject
            // which will be used to create it
            existsResult.savedObject = {
              type,
              id: configItem.id,
              attributes: configItem.config,
            };
          }
        }
      });
    });
    return savedObjectExistResults;
  }

  // update the exists flags in the kibana results
  updateKibanaResults(
    kibanaSaveResults: DataRecognizerConfigResponse['kibana'],
    objectExistResults: ObjectExistResult[]
  ) {
    (Object.keys(kibanaSaveResults) as Array<keyof DataRecognizerConfigResponse['kibana']>).forEach(
      (type) => {
        kibanaSaveResults[type].forEach((resultItem) => {
          const i = objectExistResults.find((o) => o.id === resultItem.id && o.type === type);
          resultItem.exists = i !== undefined;
        });
      }
    );
  }

  // loop through each type (dashboard, search, visualization)
  // load existing savedObjects for each type and compare to find out if
  // items with the same id already exist.
  // returns a flat list of objects with exists flags set
  async checkIfSavedObjectsExist(kibanaObjects: KibanaObjects): Promise<ObjectExistResponse[]> {
    const types = Object.keys(kibanaObjects);
    const results: ObjectExistResponse[][] = await Promise.all(
      types.map(async (type) => {
        const existingObjects = await this.loadExistingSavedObjects(type);
        return kibanaObjects[type]!.map((obj) => {
          const existingObject = existingObjects.saved_objects.find(
            (o) => o.attributes && o.attributes.title === obj.title
          );
          return {
            id: obj.id,
            type,
            exists: existingObject !== undefined,
          };
        });
      })
    );
    // merge all results
    return ([] as ObjectExistResponse[]).concat(...results);
  }

  // find all existing savedObjects for a given type
  loadExistingSavedObjects(type: string) {
    // TODO: define saved object type
    return this.savedObjectsClient.find<any>({ type, perPage: 1000 });
  }

  // save the savedObjects if they do not exist already
  async saveKibanaObjects(objectExistResults: ObjectExistResponse[]) {
    let results = { saved_objects: [] as any[] };
    const filteredSavedObjects = objectExistResults
      .filter((o) => o.exists === false)
      .map((o) => o.savedObject);
    if (filteredSavedObjects.length) {
      results = await this.savedObjectsClient.bulkCreate(
        // Add an empty migrationVersion attribute to each saved object to ensure
        // it is automatically migrated to the 7.0+ format with a references attribute.
        filteredSavedObjects.map((doc) => ({
          ...doc,
          migrationVersion: doc.migrationVersion || {},
        }))
      );
    }
    return results.saved_objects;
  }

  // save the jobs.
  // if any fail (e.g. it already exists), catch the error and mark the result
  // as success: false
  async saveJobs(jobs: ModuleJob[]): Promise<JobResponse[]> {
    return await Promise.all(
      jobs.map(async (job) => {
        const jobId = job.id;
        try {
          job.id = jobId;
          await this.saveJob(job);
          return { id: jobId, success: true };
        } catch (error) {
          return { id: jobId, success: false, error };
        }
      })
    );
  }

  async saveJob(job: ModuleJob) {
    const { id: jobId, config: body } = job;
    return this.callAsCurrentUser('ml.addJob', { jobId, body });
  }

  // save the datafeeds.
  // if any fail (e.g. it already exists), catch the error and mark the result
  // as success: false
  async saveDatafeeds(datafeeds: ModuleDataFeed[]) {
    return await Promise.all(
      datafeeds.map(async (datafeed) => {
        try {
          await this.saveDatafeed(datafeed);
          return { id: datafeed.id, success: true, started: false };
        } catch (error) {
          return { id: datafeed.id, success: false, started: false, error };
        }
      })
    );
  }

  async saveDatafeed(datafeed: ModuleDataFeed) {
    const { id: datafeedId, config: body } = datafeed;
    return this.callAsCurrentUser('ml.addDatafeed', { datafeedId, body });
  }

  async startDatafeeds(
    datafeeds: ModuleDataFeed[],
    start?: number,
    end?: number
  ): Promise<{ [key: string]: DatafeedResponse }> {
    const results = {} as { [key: string]: DatafeedResponse };
    for (const datafeed of datafeeds) {
      results[datafeed.id] = await this.startDatafeed(datafeed, start, end);
    }
    return results;
  }

  async startDatafeed(
    datafeed: ModuleDataFeed,
    start: number | undefined,
    end: number | undefined
  ): Promise<DatafeedResponse> {
    const result = { started: false } as DatafeedResponse;
    let opened = false;
    try {
      const openResult = await this.callAsCurrentUser('ml.openJob', {
        jobId: datafeed.config.job_id,
      });
      opened = openResult.opened;
    } catch (error) {
      // if the job is already open, a 409 will be returned.
      if (error.statusCode === 409) {
        opened = true;
      } else {
        opened = false;
        result.started = false;
        result.error = error;
      }
    }
    if (opened) {
      try {
        const duration: { start: number; end?: number } = { start: 0 };
        if (start !== undefined) {
          duration.start = start;
        }
        if (end !== undefined) {
          duration.end = end;
        }

        await this.callAsCurrentUser('ml.startDatafeed', { datafeedId: datafeed.id, ...duration });
        result.started = true;
      } catch (error) {
        result.started = false;
        result.error = error;
      }
    }
    return result;
  }

  // merge all of the save results into one result object
  // which is returned from the endpoint
  async updateResults(results: DataRecognizerConfigResponse, saveResults: SaveResults) {
    // update job results
    results.jobs.forEach((j) => {
      saveResults.jobs.forEach((j2) => {
        if (j.id === j2.id) {
          j.success = j2.success;
          if (j2.error !== undefined) {
            j.error = j2.error;
          }
        }
      });
    });

    // update datafeed results
    results.datafeeds.forEach((d) => {
      saveResults.datafeeds.forEach((d2) => {
        if (d.id === d2.id) {
          d.success = d2.success;
          d.started = d2.started;
          if (d2.error !== undefined) {
            d.error = d2.error;
          }
        }
      });
    });

    // update savedObjects results
    (Object.keys(results.kibana) as Array<keyof DataRecognizerConfigResponse['kibana']>).forEach(
      (category) => {
        results.kibana[category].forEach((item) => {
          const result = saveResults.savedObjects.find((o) => o.id === item.id);
          if (result !== undefined) {
            item.exists = result.exists;

            if (result.error === undefined) {
              item.success = true;
            } else {
              item.success = false;
              item.error = result.error;
            }
          }
        });
      }
    );
  }

  // creates an empty results object,
  // listing each job/datafeed/savedObject with a save success boolean
  createResultsTemplate(moduleConfig: Module): DataRecognizerConfigResponse {
    const results: DataRecognizerConfigResponse = {} as DataRecognizerConfigResponse;
    const reducedConfig = {
      jobs: moduleConfig.jobs,
      datafeeds: moduleConfig.datafeeds,
      kibana: moduleConfig.kibana,
    };

    function createResultsItems(
      configItems: any[],
      resultItems: any,
      index: string | number
    ): void {
      resultItems[index] = [];
      configItems.forEach((j) => {
        resultItems[index].push({
          id: j.id,
          success: false,
        });
      });
    }

    (Object.keys(reducedConfig) as Array<keyof typeof reducedConfig>).forEach((i) => {
      if (Array.isArray(reducedConfig[i])) {
        createResultsItems(reducedConfig[i] as any[], results, i);
      } else {
        results[i] = {} as any;
        Object.keys(reducedConfig[i]).forEach((k) => {
          createResultsItems((reducedConfig[i] as Module['kibana'])[k] as any[], results[i], k);
        });
      }
    });

    return results;
  }

  // if an override index pattern has been specified,
  // update all of the datafeeds.
  updateDatafeedIndices(moduleConfig: Module) {
    // if the supplied index pattern contains a comma, split into multiple indices and
    // add each one to the datafeed
    const indexPatternNames = splitIndexPatternNames(this.indexPatternName);

    moduleConfig.datafeeds.forEach((df) => {
      const newIndices: string[] = [];
      // the datafeed can contain indexes and indices
      const currentIndices =
        df.config.indexes !== undefined ? df.config.indexes : df.config.indices;

      currentIndices.forEach((index) => {
        if (index === INDEX_PATTERN_NAME) {
          // the datafeed index is INDEX_PATTERN_NAME, so replace it with index pattern(s)
          // supplied by the user or the default one from the manifest
          newIndices.push(...indexPatternNames);
        } else {
          // otherwise keep using the index from the datafeed json
          newIndices.push(index);
        }
      });

      // just in case indexes was used, delete it in favour of indices
      delete df.config.indexes;
      df.config.indices = newIndices;
    });
  }

  // loop through the custom urls in each job and replace the INDEX_PATTERN_ID
  // marker for the id of the specified index pattern
  updateJobUrlIndexPatterns(moduleConfig: Module) {
    if (Array.isArray(moduleConfig.jobs)) {
      moduleConfig.jobs.forEach((job) => {
        // if the job has custom_urls
        if (job.config.custom_settings && job.config.custom_settings.custom_urls) {
          // loop through each url, replacing the INDEX_PATTERN_ID marker
          job.config.custom_settings.custom_urls.forEach((cUrl) => {
            const url = cUrl.url_value;
            if (url.match(INDEX_PATTERN_ID)) {
              const newUrl = url.replace(
                new RegExp(INDEX_PATTERN_ID, 'g'),
                this.indexPatternId as string
              );
              // update the job's url
              cUrl.url_value = newUrl;
            }
          });
        }
      });
    }
  }

  // check the custom urls in the module's jobs to see if they contain INDEX_PATTERN_ID
  // which needs replacement
  doJobUrlsContainIndexPatternId(moduleConfig: Module) {
    if (Array.isArray(moduleConfig.jobs)) {
      for (const job of moduleConfig.jobs) {
        // if the job has custom_urls
        if (job.config.custom_settings && job.config.custom_settings.custom_urls) {
          for (const cUrl of job.config.custom_settings.custom_urls) {
            if (cUrl.url_value.match(INDEX_PATTERN_ID)) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  // loop through each kibana saved object and replace any INDEX_PATTERN_ID and
  // INDEX_PATTERN_NAME markers for the id or name of the specified index pattern
  updateSavedObjectIndexPatterns(moduleConfig: Module) {
    if (moduleConfig.kibana) {
      Object.keys(moduleConfig.kibana).forEach((category) => {
        moduleConfig.kibana[category]!.forEach((item) => {
          let jsonString = item.config.kibanaSavedObjectMeta!.searchSourceJSON;
          if (jsonString.match(INDEX_PATTERN_ID)) {
            jsonString = jsonString.replace(
              new RegExp(INDEX_PATTERN_ID, 'g'),
              this.indexPatternId as string
            );
            item.config.kibanaSavedObjectMeta!.searchSourceJSON = jsonString;
          }

          if (category === SAVED_OBJECT_TYPES.VISUALIZATION) {
            // Look for any INDEX_PATTERN_NAME tokens in visualization visState,
            // as e.g. Vega visualizations reference the Elasticsearch index pattern directly.
            let visStateString = String(item.config.visState);
            if (visStateString !== undefined && visStateString.match(INDEX_PATTERN_NAME)) {
              visStateString = visStateString.replace(
                new RegExp(INDEX_PATTERN_NAME, 'g'),
                this.indexPatternName
              );
              item.config.visState = visStateString;
            }
          }
        });
      });
    }
  }

  /**
   * Provides a time range of the last 3 months of data
   */
  async getFallbackTimeRange(
    timeField: string,
    query?: any
  ): Promise<{ start: number; end: number }> {
    const fieldsService = fieldsServiceProvider(this.callAsCurrentUser);

    const timeFieldRange = await fieldsService.getTimeFieldRange(
      this.indexPatternName,
      timeField,
      query
    );

    return {
      start: timeFieldRange.end.epoch - moment.duration(3, 'months').asMilliseconds(),
      end: timeFieldRange.end.epoch,
    };
  }

  /**
   * Ensure the model memory limit for each job is not greater than
   * the max model memory setting for the cluster
   */
  async updateModelMemoryLimits(
    moduleConfig: Module,
    estimateMML: boolean,
    start?: number,
    end?: number
  ) {
    if (!Array.isArray(moduleConfig.jobs)) {
      return;
    }

    if (estimateMML && this.jobsForModelMemoryEstimation.length > 0) {
      try {
        const calculateModelMemoryLimit = calculateModelMemoryLimitProvider(this.callAsCurrentUser);

        // Checks if all jobs in the module have the same time field configured
        const firstJobTimeField = this.jobsForModelMemoryEstimation[0].job.config.data_description
          .time_field;
        const isSameTimeFields = this.jobsForModelMemoryEstimation.every(
          ({ job }) => job.config.data_description.time_field === firstJobTimeField
        );

        if (isSameTimeFields && (start === undefined || end === undefined)) {
          // In case of time range is not provided and the time field is the same
          // set the fallback range for all jobs
          // as there may not be a common query, we use a match_all
          const {
            start: fallbackStart,
            end: fallbackEnd,
          } = await this.getFallbackTimeRange(firstJobTimeField, { match_all: {} });
          start = fallbackStart;
          end = fallbackEnd;
        }

        for (const { job, query } of this.jobsForModelMemoryEstimation) {
          let earliestMs = start;
          let latestMs = end;
          if (earliestMs === undefined || latestMs === undefined) {
            const timeFieldRange = await this.getFallbackTimeRange(
              job.config.data_description.time_field,
              query
            );
            earliestMs = timeFieldRange.start;
            latestMs = timeFieldRange.end;
          }

          const { modelMemoryLimit } = await calculateModelMemoryLimit(
            job.config.analysis_config,
            this.indexPatternName,
            query,
            job.config.data_description.time_field,
            earliestMs,
            latestMs
          );

          if (!job.config.analysis_limits) {
            job.config.analysis_limits = {} as AnalysisLimits;
          }

          job.config.analysis_limits.model_memory_limit = modelMemoryLimit;
        }
      } catch (error) {
        mlLog.warn(`Data recognizer could not estimate model memory limit ${error}`);
      }
    }

    const { limits } = await this.callAsCurrentUser<MlInfoResponse>('ml.info');
    const maxMml = limits.max_model_memory_limit;

    if (!maxMml) {
      return;
    }

    // @ts-ignore
    const maxBytes: number = numeral(maxMml.toUpperCase()).value();

    for (const job of moduleConfig.jobs) {
      const mml = job.config?.analysis_limits?.model_memory_limit;
      if (mml !== undefined) {
        // @ts-ignore
        const mmlBytes: number = numeral(mml.toUpperCase()).value();
        if (mmlBytes > maxBytes) {
          // if the job's mml is over the max,
          // so set the jobs mml to be the max

          if (!job.config.analysis_limits) {
            job.config.analysis_limits = {} as AnalysisLimits;
          }

          job.config.analysis_limits.model_memory_limit = maxMml;
        }
      }
    }
  }

  // check the kibana saved searches JSON in the module to see if they contain INDEX_PATTERN_ID
  // which needs replacement
  doSavedObjectsContainIndexPatternId(moduleConfig: Module) {
    if (moduleConfig.kibana) {
      for (const category of Object.keys(moduleConfig.kibana)) {
        for (const item of moduleConfig.kibana[category]!) {
          const jsonString = item.config.kibanaSavedObjectMeta!.searchSourceJSON;
          if (jsonString.match(INDEX_PATTERN_ID)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  applyJobConfigOverrides(
    moduleConfig: Module,
    jobOverrides?: JobOverride | JobOverride[],
    jobPrefix = ''
  ) {
    if (jobOverrides === undefined || jobOverrides === null) {
      return;
    }

    if (typeof jobOverrides !== 'object') {
      throw Boom.badRequest(
        `Incompatible jobOverrides type (${typeof jobOverrides}). It needs to be an object or array of objects.`
      );
    }

    // jobOverrides could be a single object or an array of objects.
    // if single, convert to an array
    const overrides = Array.isArray(jobOverrides) ? jobOverrides : [jobOverrides];
    const { jobs } = moduleConfig;

    // separate all the overrides.
    // the overrides which don't contain a job id will be applied to all jobs in the module
    const generalOverrides: GeneralJobsOverride[] = [];
    const jobSpecificOverrides: JobSpecificOverride[] = [];

    overrides.forEach((override) => {
      if (isGeneralJobOverride(override)) {
        generalOverrides.push(override);
      } else {
        jobSpecificOverrides.push(override);
      }
    });

    if (generalOverrides.some((override) => !!override.analysis_limits?.model_memory_limit)) {
      this.jobsForModelMemoryEstimation = [];
    } else {
      this.jobsForModelMemoryEstimation = moduleConfig.jobs
        .filter((job) => {
          const override = jobSpecificOverrides.find((o) => `${jobPrefix}${o.job_id}` === job.id);
          return override?.analysis_limits?.model_memory_limit === undefined;
        })
        .map((job) => ({
          job,
          query:
            moduleConfig.datafeeds.find((d) => d.config.job_id === job.id)?.config.query || null,
        }));
    }

    function processArrayValues(source: any, update: any) {
      if (typeof source !== 'object' || typeof update !== 'object') {
        return;
      }

      Object.keys(source).forEach((key) => {
        const sourceValue = source[key];
        const updateValue = update[key];

        if (
          typeof sourceValue !== 'object' ||
          sourceValue === null ||
          typeof updateValue !== 'object' ||
          updateValue === null
        ) {
          return;
        }

        if (Array.isArray(sourceValue) && Array.isArray(updateValue)) {
          source[key] = updateValue;
        } else {
          processArrayValues(sourceValue, updateValue);
        }
      });
    }

    generalOverrides.forEach((generalOverride) => {
      jobs.forEach((job) => {
        merge(job.config, generalOverride);
        processArrayValues(job.config, generalOverride);
      });
    });

    jobSpecificOverrides.forEach((jobSpecificOverride) => {
      // for each override, find the relevant job.
      // note, the job id already has the prefix prepended to it
      const job = jobs.find((j) => j.id === `${jobPrefix}${jobSpecificOverride.job_id}`);
      if (job !== undefined) {
        // delete the job_id in the override as this shouldn't be overridden
        delete jobSpecificOverride.job_id;
        merge(job.config, jobSpecificOverride);
        processArrayValues(job.config, jobSpecificOverride);
      }
    });
  }

  applyDatafeedConfigOverrides(
    moduleConfig: Module,
    datafeedOverrides?: DatafeedOverride | DatafeedOverride[],
    jobPrefix = ''
  ) {
    if (datafeedOverrides !== undefined && datafeedOverrides !== null) {
      if (typeof datafeedOverrides !== 'object') {
        throw Boom.badRequest(
          `Incompatible datafeedOverrides type (${typeof datafeedOverrides}). It needs to be an object or array of objects.`
        );
      }

      // jobOverrides could be a single object or an array of objects.
      // if single, convert to an array
      const overrides = Array.isArray(datafeedOverrides) ? datafeedOverrides : [datafeedOverrides];
      const { datafeeds } = moduleConfig;

      // separate all the overrides.
      // the overrides which don't contain a datafeed id or a job id will be applied to all jobs in the module
      const generalOverrides: GeneralDatafeedsOverride[] = [];
      const datafeedSpecificOverrides: DatafeedOverride[] = [];
      overrides.forEach((o) => {
        if (o.datafeed_id === undefined && o.job_id === undefined) {
          generalOverrides.push(o);
        } else {
          datafeedSpecificOverrides.push(o);
        }
      });

      generalOverrides.forEach((o) => {
        datafeeds.forEach(({ config }) => {
          merge(config, o);
        });
      });

      // collect all the overrides which contain either a job id or a datafeed id
      datafeedSpecificOverrides.forEach((o) => {
        // either a job id or datafeed id has been specified, so create a new id
        // containing either one plus the prefix
        const tempId: string = String(o.datafeed_id !== undefined ? o.datafeed_id : o.job_id);
        const dId = prefixDatafeedId(tempId, jobPrefix);

        const datafeed = datafeeds.find((d) => d.id === dId);
        if (datafeed !== undefined) {
          delete o.job_id;
          delete o.datafeed_id;
          merge(datafeed.config, o);
        }
      });
    }
  }
}
