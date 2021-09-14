/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import Boom from '@hapi/boom';
import numeral from '@elastic/numeral';
import { KibanaRequest, IScopedClusterClient, SavedObjectsClientContract } from 'kibana/server';

import moment from 'moment';
import { IndexPatternAttributes } from 'src/plugins/data/server';
import { merge } from 'lodash';
import { AnalysisLimits } from '../../../common/types/anomaly_detection_jobs';
import { getAuthorizationHeader } from '../../lib/request_authorization';
import { MlInfoResponse } from '../../../common/types/ml_server_info';
import type { MlClient } from '../../lib/ml_client';
import { ML_MODULE_SAVED_OBJECT_TYPE } from '../../../common/types/saved_objects';
import {
  KibanaObjects,
  KibanaObjectConfig,
  ModuleDatafeed,
  ModuleJob,
  Module,
  FileBasedModule,
  Logo,
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
import { mlLog } from '../../lib/log';
import { calculateModelMemoryLimitProvider } from '../calculate_model_memory_limit';
import { fieldsServiceProvider } from '../fields_service';
import { jobServiceProvider } from '../job_service';
import { resultsServiceProvider } from '../results_service';
import { JobExistResult, JobStat } from '../../../common/types/data_recognizer';
import { MlJobsStatsResponse } from '../../../common/types/job_service';
import { Datafeed } from '../../../common/types/anomaly_detection_jobs';
import { JobSavedObjectService } from '../../saved_objects';
import { isDefined } from '../../../common/types/guards';
import { isPopulatedObject } from '../../../common/util/object_utils';

const ML_DIR = 'ml';
const KIBANA_DIR = 'kibana';
const INDEX_PATTERN_ID = 'INDEX_PATTERN_ID';
const INDEX_PATTERN_NAME = 'INDEX_PATTERN_NAME';
export const SAVED_OBJECT_TYPES = {
  DASHBOARD: 'dashboard',
  SEARCH: 'search',
  VISUALIZATION: 'visualization',
};

function isModule(arg: unknown): arg is Module {
  return isPopulatedObject(arg) && Array.isArray(arg.jobs) && arg.jobs[0]?.config !== undefined;
}

function isFileBasedModule(arg: unknown): arg is FileBasedModule {
  return isPopulatedObject(arg) && Array.isArray(arg.jobs) && arg.jobs[0]?.file !== undefined;
}

interface Config {
  dirName?: string;
  module: FileBasedModule | Module;
  isSavedObject: boolean;
}

export interface RecognizeResult {
  id: string;
  title: string;
  query: any;
  description: string;
  logo: Logo;
}

interface ObjectExistResult {
  id: string;
  type: string;
  exists?: boolean;
}

interface ObjectExistResponse {
  id: string;
  type: string;
  exists: boolean;
  savedObject?: { id: string; type: string; attributes: KibanaObjectConfig };
}

interface SaveResults {
  jobs: JobResponse[];
  datafeeds: DatafeedResponse[];
  savedObjects: KibanaObjectResponse[];
}

export class DataRecognizer {
  private _client: IScopedClusterClient;
  private _mlClient: MlClient;
  private _savedObjectsClient: SavedObjectsClientContract;
  private _jobSavedObjectService: JobSavedObjectService;
  private _request: KibanaRequest;

  private _authorizationHeader: object;
  private _modulesDir = `${__dirname}/modules`;
  private _indexPatternName: string = '';
  private _indexPatternId: string | undefined = undefined;

  private _jobsService: ReturnType<typeof jobServiceProvider>;
  private _resultsService: ReturnType<typeof resultsServiceProvider>;
  private _calculateModelMemoryLimit: ReturnType<typeof calculateModelMemoryLimitProvider>;

  /**
   * List of the module jobs that require model memory estimation
   */
  private _jobsForModelMemoryEstimation: Array<{ job: ModuleJob; query: any }> = [];

  constructor(
    mlClusterClient: IScopedClusterClient,
    mlClient: MlClient,
    savedObjectsClient: SavedObjectsClientContract,
    jobSavedObjectService: JobSavedObjectService,
    request: KibanaRequest
  ) {
    this._client = mlClusterClient;
    this._mlClient = mlClient;
    this._savedObjectsClient = savedObjectsClient;
    this._jobSavedObjectService = jobSavedObjectService;
    this._request = request;
    this._authorizationHeader = getAuthorizationHeader(request);
    this._jobsService = jobServiceProvider(mlClusterClient, mlClient);
    this._resultsService = resultsServiceProvider(mlClient);
    this._calculateModelMemoryLimit = calculateModelMemoryLimitProvider(mlClusterClient, mlClient);
  }

  // list all directories under the given directory
  private async _listDirs(dirName: string): Promise<string[]> {
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

  private async _readFile(fileName: string): Promise<string> {
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

  private async _loadConfigs(): Promise<Config[]> {
    const configs: Config[] = [];
    const dirs = await this._listDirs(this._modulesDir);
    await Promise.all(
      dirs.map(async (dir) => {
        let file: string | undefined;
        try {
          file = await this._readFile(`${this._modulesDir}/${dir}/manifest.json`);
        } catch (error) {
          mlLog.warn(`Data recognizer skipping folder ${dir} as manifest.json cannot be read`);
        }

        if (file !== undefined) {
          try {
            configs.push({
              dirName: dir,
              module: JSON.parse(file),
              isSavedObject: false,
            });
          } catch (error) {
            mlLog.warn(`Data recognizer error parsing ${dir}/manifest.json. ${error}`);
          }
        }
      })
    );

    const savedObjectConfigs = (await this._loadSavedObjectModules()).map((module) => ({
      module,
      isSavedObject: true,
    }));

    return [...configs, ...savedObjectConfigs];
  }

  private async _loadSavedObjectModules() {
    const jobs = await this._savedObjectsClient.find<Module>({
      type: ML_MODULE_SAVED_OBJECT_TYPE,
      perPage: 10000,
    });

    return jobs.saved_objects.map((o) => o.attributes);
  }

  // get the manifest.json file for a specified id, e.g. "nginx"
  private async _findConfig(id: string) {
    const configs = await this._loadConfigs();
    return configs.find((i) => i.module.id === id);
  }

  // called externally by an endpoint
  public async findMatches(indexPattern: string): Promise<RecognizeResult[]> {
    const manifestFiles = await this._loadConfigs();
    const results: RecognizeResult[] = [];

    await Promise.all(
      manifestFiles.map(async (i) => {
        const moduleConfig = i.module;
        let match = false;
        try {
          match = await this._searchForFields(moduleConfig, indexPattern);
        } catch (error) {
          mlLog.warn(
            `Data recognizer error running query defined for module ${moduleConfig.id}. ${error}`
          );
        }

        if (match === true) {
          let logo: Logo = null;
          if (moduleConfig.logo) {
            logo = moduleConfig.logo;
          } else if (moduleConfig.logoFile) {
            try {
              const logoFile = await this._readFile(
                `${this._modulesDir}/${i.dirName}/${moduleConfig.logoFile}`
              );
              logo = JSON.parse(logoFile);
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

    results.sort((res1, res2) => res1.id.localeCompare(res2.id));

    return results;
  }

  private async _searchForFields(moduleConfig: FileBasedModule | Module, indexPattern: string) {
    if (moduleConfig.query === undefined) {
      return false;
    }

    const index = indexPattern;
    const size = 0;
    const searchBody = {
      query: moduleConfig.query,
    };

    const { body } = await this._client.asCurrentUser.search({
      index,
      size,
      body: searchBody,
    });

    // @ts-expect-error incorrect search response type
    return body.hits.total.value > 0;
  }

  public async listModules() {
    const manifestFiles = await this._loadConfigs();
    manifestFiles.sort((a, b) => a.module.id.localeCompare(b.module.id)); // sort as json files are read from disk and could be in any order.

    const configs: Array<Module | FileBasedModule> = [];
    for (const config of manifestFiles) {
      if (config.isSavedObject) {
        configs.push(config.module);
      } else {
        configs.push(await this.getModule(config.module.id));
      }
    }
    // casting return as Module[] so not to break external plugins who rely on this function
    // once FileBasedModules are removed this function will only deal with Modules
    return configs as Module[];
  }

  // called externally by an endpoint
  // supplying an optional prefix will add the prefix
  // to the job and datafeed configs
  public async getModule(id: string, prefix = ''): Promise<Module> {
    let module: FileBasedModule | Module | null = null;
    let dirName: string | null = null;

    const config = await this._findConfig(id);
    if (config !== undefined) {
      module = config.module;
      dirName = config.dirName ?? null;
    } else {
      throw Boom.notFound(`Module with the id "${id}" not found`);
    }

    const jobs: ModuleJob[] = [];
    const datafeeds: ModuleDatafeed[] = [];
    const kibana: KibanaObjects = {};
    // load all of the job configs
    if (isModule(module)) {
      const tempJobs: ModuleJob[] = module.jobs.map((j) => ({
        id: `${prefix}${j.id}`,
        config: j.config,
      }));
      jobs.push(...tempJobs);
      const tempDatafeeds: ModuleDatafeed[] = module.datafeeds.map((d) => {
        const jobId = `${prefix}${d.job_id}`;
        return {
          id: prefixDatafeedId(d.id, prefix),
          job_id: jobId,
          config: {
            ...d.config,
            job_id: jobId,
          },
        };
      });
      datafeeds.push(...tempDatafeeds);
    } else if (isFileBasedModule(module)) {
      const tempJobs = module.jobs.map(async (job) => {
        try {
          const jobConfig = await this._readFile(
            `${this._modulesDir}/${dirName}/${ML_DIR}/${job.file}`
          );
          // use the file name for the id
          return {
            id: `${prefix}${job.id}`,
            config: JSON.parse(jobConfig),
          };
        } catch (error) {
          mlLog.warn(
            `Data recognizer error loading config for job ${job.id} for module ${id}. ${error}`
          );
        }
      });
      jobs.push(...(await Promise.all(tempJobs)).filter(isDefined));

      // load all of the datafeed configs
      const tempDatafeed = module.datafeeds.map(async (datafeed) => {
        try {
          const datafeedConfigString = await this._readFile(
            `${this._modulesDir}/${dirName}/${ML_DIR}/${datafeed.file}`
          );
          const datafeedConfig = JSON.parse(datafeedConfigString) as Datafeed;
          // use the job id from the module
          datafeedConfig.job_id = `${prefix}${datafeed.job_id}`;

          return {
            id: prefixDatafeedId(datafeed.id, prefix),
            job_id: datafeedConfig.job_id,
            config: datafeedConfig,
          };
        } catch (error) {
          mlLog.warn(
            `Data recognizer error loading config for datafeed ${datafeed.id} for module ${id}. ${error}`
          );
        }
      });

      datafeeds.push(...(await Promise.all(tempDatafeed)).filter(isDefined));
    }
    // load all of the kibana saved objects
    if (module.kibana !== undefined) {
      const kKeys = Object.keys(module.kibana) as Array<keyof FileBasedModule['kibana']>;
      await Promise.all(
        kKeys.map(async (key) => {
          kibana[key] = [];
          if (isFileBasedModule(module)) {
            await Promise.all(
              module.kibana[key].map(async (obj) => {
                try {
                  const kConfigString = await this._readFile(
                    `${this._modulesDir}/${dirName}/${KIBANA_DIR}/${key}/${obj.file}`
                  );
                  // use the file name for the id
                  const kId = obj.file.replace('.json', '');
                  const kConfig = JSON.parse(kConfigString);
                  kibana[key]!.push({
                    id: kId,
                    title: kConfig.title,
                    config: kConfig,
                  });
                } catch (error) {
                  mlLog.warn(
                    `Data recognizer error loading config for ${key} ${obj.id} for module ${id}. ${error}`
                  );
                }
              })
            );
          }
        })
      );
    }

    return {
      ...module,
      jobs,
      datafeeds,
      kibana,
    };
  }

  // called externally by an endpoint
  // takes a module config id, an optional jobPrefix and the request object
  // creates all of the jobs, datafeeds and savedObjects  listed in the module config.
  // if any of the savedObjects already exist, they will not be overwritten.
  public async setup(
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
    estimateModelMemory: boolean = true,
    applyToAllSpaces: boolean = false
  ) {
    // load the config from disk
    const moduleConfig = await this.getModule(moduleId, jobPrefix);

    if (indexPatternName === undefined && moduleConfig.defaultIndexPattern === undefined) {
      throw Boom.badRequest(
        `No index pattern configured in "${moduleId}" configuration file and no index pattern passed to the endpoint`
      );
    }

    this._indexPatternName =
      indexPatternName === undefined ? moduleConfig.defaultIndexPattern : indexPatternName;
    this._indexPatternId = await this._getIndexPatternId(this._indexPatternName);

    // the module's jobs contain custom URLs which require an index patten id
    // but there is no corresponding index pattern, throw an error
    if (this._indexPatternId === undefined && this._doJobUrlsContainIndexPatternId(moduleConfig)) {
      throw Boom.badRequest(
        `Module's jobs contain custom URLs which require a kibana index pattern (${this._indexPatternName}) which cannot be found.`
      );
    }

    // the module's saved objects require an index patten id
    // but there is no corresponding index pattern, throw an error
    if (
      this._indexPatternId === undefined &&
      this._doSavedObjectsContainIndexPatternId(moduleConfig)
    ) {
      throw Boom.badRequest(
        `Module's saved objects contain custom URLs which require a kibana index pattern (${this._indexPatternName}) which cannot be found.`
      );
    }

    // create an empty results object
    const results = this._createResultsTemplate(moduleConfig);
    const saveResults: SaveResults = {
      jobs: [] as JobResponse[],
      datafeeds: [] as DatafeedResponse[],
      savedObjects: [] as KibanaObjectResponse[],
    };

    this._jobsForModelMemoryEstimation = moduleConfig.jobs.map((job) => ({
      job,
      query: moduleConfig.datafeeds.find((d) => d.config.job_id === job.id)?.config.query ?? null,
    }));

    this.applyJobConfigOverrides(moduleConfig, jobOverrides, jobPrefix);
    this.applyDatafeedConfigOverrides(moduleConfig, datafeedOverrides, jobPrefix);
    this._updateDatafeedIndices(moduleConfig);
    this._updateJobUrlIndexPatterns(moduleConfig);
    await this._updateModelMemoryLimits(moduleConfig, estimateModelMemory, start, end);

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
      saveResults.jobs = await this._saveJobs(moduleConfig.jobs, applyToAllSpaces);
    }

    // create the datafeeds
    if (moduleConfig.datafeeds && moduleConfig.datafeeds.length) {
      if (typeof query === 'object' && query !== null) {
        moduleConfig.datafeeds.forEach((df) => {
          df.config.query = query;
        });
      }
      saveResults.datafeeds = await this._saveDatafeeds(moduleConfig.datafeeds);

      if (startDatafeed) {
        const savedDatafeeds = moduleConfig.datafeeds.filter((df) => {
          const datafeedResult = saveResults.datafeeds.find((d) => d.id === df.id);
          return datafeedResult !== undefined && datafeedResult.success === true;
        });

        const startResults = await this._startDatafeeds(savedDatafeeds, start, end);
        saveResults.datafeeds.forEach((df) => {
          const startedDatafeed = startResults[df.id];
          if (startedDatafeed !== undefined) {
            df.started = startedDatafeed.started;
            df.awaitingMlNodeAllocation = startedDatafeed.awaitingMlNodeAllocation;
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
      this._updateSavedObjectIndexPatterns(moduleConfig);

      const savedObjects = await this._createSavedObjectsToSave(moduleConfig);
      // update the exists flag in the results
      this._updateKibanaResults(results.kibana, savedObjects);
      // create the savedObjects
      try {
        saveResults.savedObjects = await this._saveKibanaObjects(savedObjects);
      } catch (error) {
        // only one error is returned for the bulk create saved object request
        // so populate every saved object with the same error.
        this._populateKibanaResultErrors(results.kibana, error.output?.payload);
      }
    }
    // merge all the save results
    this._updateResults(results, saveResults);
    return results;
  }

  public async dataRecognizerJobsExist(moduleId: string): Promise<JobExistResult> {
    const results = {} as JobExistResult;

    // Load the module with the specified ID and check if the jobs
    // in the module have been created.
    const module = await this.getModule(moduleId);
    if (module && module.jobs) {
      // Add a wildcard at the front of each of the job IDs in the module,
      // as a prefix may have been supplied when creating the jobs in the module.
      const jobIds = module.jobs.map((job) => `*${job.id}`);
      const jobInfo = await this._jobsService.jobsExist(jobIds);

      // Check if the value for any of the jobs is false.
      const doJobsExist = Object.values(jobInfo).every((j) => j.exists === true);
      results.jobsExist = doJobsExist;

      if (doJobsExist === true) {
        // Get the IDs of the jobs created from the module, and their earliest / latest timestamps.
        const { body } = await this._mlClient.getJobStats<MlJobsStatsResponse>({
          job_id: jobIds.join(),
        });
        const jobStatsJobs: JobStat[] = [];
        if (body.jobs && body.jobs.length > 0) {
          const foundJobIds = body.jobs.map((job) => job.job_id);
          const latestBucketTimestampsByJob = await this._resultsService.getLatestBucketTimestampByJob(
            foundJobIds
          );

          body.jobs.forEach((job) => {
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

  private async _loadIndexPatterns() {
    return await this._savedObjectsClient.find<IndexPatternAttributes>({
      type: 'index-pattern',
      perPage: 1000,
    });
  }

  // returns a id based on an index pattern name
  private async _getIndexPatternId(name: string) {
    try {
      const indexPatterns = await this._loadIndexPatterns();
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
  private async _createSavedObjectsToSave(moduleConfig: Module) {
    // first check if the saved objects already exist.
    const savedObjectExistResults = await this._checkIfSavedObjectsExist(moduleConfig.kibana);
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
  private _updateKibanaResults(
    kibanaSaveResults: DataRecognizerConfigResponse['kibana'],
    objectExistResults: ObjectExistResult[]
  ) {
    (Object.keys(kibanaSaveResults) as Array<keyof DataRecognizerConfigResponse['kibana']>).forEach(
      (type) => {
        kibanaSaveResults[type].forEach((resultItem) => {
          const i = objectExistResults.find((o) => o.id === resultItem.id && o.type === type);
          resultItem.exists = i !== undefined && i.exists;
        });
      }
    );
  }

  // add an error object to every kibana saved object,
  // if it doesn't already exist.
  private _populateKibanaResultErrors(
    kibanaSaveResults: DataRecognizerConfigResponse['kibana'],
    error: any
  ) {
    const errorObj =
      error === undefined ? { message: 'Unknown error when creating saved object' } : error;
    (Object.keys(kibanaSaveResults) as Array<keyof DataRecognizerConfigResponse['kibana']>).forEach(
      (type) => {
        kibanaSaveResults[type].forEach((resultItem) => {
          if (resultItem.exists === false) {
            resultItem.error = errorObj;
          }
        });
      }
    );
  }

  // loop through each type (dashboard, search, visualization)
  // load existing savedObjects for each type and compare to find out if
  // items with the same id already exist.
  // returns a flat list of objects with exists flags set
  private async _checkIfSavedObjectsExist(
    kibanaObjects: KibanaObjects
  ): Promise<ObjectExistResponse[]> {
    const types = Object.keys(kibanaObjects);
    const results: ObjectExistResponse[][] = await Promise.all(
      types.map(async (type) => {
        const existingObjects = await this._loadExistingSavedObjects(type);
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
  private _loadExistingSavedObjects(type: string) {
    // TODO: define saved object type
    return this._savedObjectsClient.find<any>({ type, perPage: 1000 });
  }

  // save the savedObjects if they do not exist already
  private async _saveKibanaObjects(objectExistResults: ObjectExistResponse[]) {
    let results = { saved_objects: [] as any[] };
    const filteredSavedObjects = objectExistResults
      .filter((o) => o.exists === false)
      .map((o) => o.savedObject!);
    if (filteredSavedObjects.length) {
      results = await this._savedObjectsClient.bulkCreate(
        // Add an empty migrationVersion attribute to each saved object to ensure
        // it is automatically migrated to the 7.0+ format with a references attribute.
        filteredSavedObjects.map((doc) => ({
          ...doc,
          migrationVersion: {},
        }))
      );
    }
    return results.saved_objects;
  }

  // save the jobs.
  // if any fail (e.g. it already exists), catch the error and mark the result
  // as success: false
  private async _saveJobs(
    jobs: ModuleJob[],
    applyToAllSpaces: boolean = false
  ): Promise<JobResponse[]> {
    const resp = await Promise.all(
      jobs.map(async (job) => {
        const jobId = job.id;
        try {
          job.id = jobId;
          await this._saveJob(job);
          return { id: jobId, success: true };
        } catch ({ body }) {
          return { id: jobId, success: false, error: body };
        }
      })
    );
    if (applyToAllSpaces === true) {
      const canCreateGlobalJobs = await this._jobSavedObjectService.canCreateGlobalJobs(
        this._request
      );
      if (canCreateGlobalJobs === true) {
        await this._jobSavedObjectService.updateJobsSpaces(
          'anomaly-detector',
          jobs.map((j) => j.id),
          ['*'], // spacesToAdd
          [] // spacesToRemove
        );
      }
    }
    return resp;
  }

  private async _saveJob(job: ModuleJob) {
    return this._mlClient.putJob({ job_id: job.id, body: job.config });
  }

  // save the datafeeds.
  // if any fail (e.g. it already exists), catch the error and mark the result
  // as success: false
  private async _saveDatafeeds(datafeeds: ModuleDatafeed[]) {
    return await Promise.all(
      datafeeds.map(async (datafeed) => {
        try {
          await this._saveDatafeed(datafeed);
          return {
            id: datafeed.id,
            success: true,
            started: false,
            awaitingMlNodeAllocation: false,
          };
        } catch ({ body }) {
          return {
            id: datafeed.id,
            success: false,
            started: false,
            awaitingMlNodeAllocation: false,
            error: body,
          };
        }
      })
    );
  }

  private async _saveDatafeed(datafeed: ModuleDatafeed) {
    return this._mlClient.putDatafeed(
      {
        datafeed_id: datafeed.id,
        body: datafeed.config,
      },
      this._authorizationHeader
    );
  }

  private async _startDatafeeds(
    datafeeds: ModuleDatafeed[],
    start?: number,
    end?: number
  ): Promise<{ [key: string]: DatafeedResponse }> {
    const results = {} as { [key: string]: DatafeedResponse };
    for (const datafeed of datafeeds) {
      results[datafeed.id] = await this._startDatafeed(datafeed, start, end);
    }
    return results;
  }

  private async _startDatafeed(
    datafeed: ModuleDatafeed,
    start: number | undefined,
    end: number | undefined
  ): Promise<DatafeedResponse> {
    const result = { started: false } as DatafeedResponse;
    let opened = false;
    try {
      const { body } = await this._mlClient.openJob({
        job_id: datafeed.config.job_id,
      });
      opened = body.opened;
    } catch (error) {
      // if the job is already open, a 409 will be returned.
      if (error.statusCode === 409) {
        opened = true;
      } else {
        opened = false;
        result.started = false;
        result.error = error.body;
      }
    }
    if (opened) {
      try {
        const duration: { start: string; end?: string } = { start: '0' };
        if (start !== undefined) {
          duration.start = String(start);
        }
        if (end !== undefined) {
          duration.end = String(end);
        }

        const {
          body: { started, node },
        } = await this._mlClient.startDatafeed<{
          started: boolean;
          node: string;
        }>({
          datafeed_id: datafeed.id,
          ...duration,
        });

        result.started = started;
        result.awaitingMlNodeAllocation = node?.length === 0;
      } catch ({ body }) {
        result.started = false;
        result.error = body;
      }
    }
    return result;
  }

  // merge all of the save results into one result object
  // which is returned from the endpoint
  private async _updateResults(results: DataRecognizerConfigResponse, saveResults: SaveResults) {
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
          d.awaitingMlNodeAllocation = d2.awaitingMlNodeAllocation;
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
  private _createResultsTemplate(moduleConfig: Module): DataRecognizerConfigResponse {
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
  private _updateDatafeedIndices(moduleConfig: Module) {
    // if the supplied index pattern contains a comma, split into multiple indices and
    // add each one to the datafeed
    const indexPatternNames = splitIndexPatternNames(this._indexPatternName);

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
  private _updateJobUrlIndexPatterns(moduleConfig: Module) {
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
                this._indexPatternId as string
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
  private _doJobUrlsContainIndexPatternId(moduleConfig: Module) {
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
  private _updateSavedObjectIndexPatterns(moduleConfig: Module) {
    if (moduleConfig.kibana) {
      Object.keys(moduleConfig.kibana).forEach((category) => {
        moduleConfig.kibana[category]!.forEach((item) => {
          let jsonString = item.config.kibanaSavedObjectMeta!.searchSourceJSON;
          if (jsonString.match(INDEX_PATTERN_ID)) {
            jsonString = jsonString.replace(
              new RegExp(INDEX_PATTERN_ID, 'g'),
              this._indexPatternId as string
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
                this._indexPatternName
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
  private async _getFallbackTimeRange(
    timeField: string,
    query?: any
  ): Promise<{ start: number; end: number }> {
    const fieldsService = fieldsServiceProvider(this._client);

    const timeFieldRange = await fieldsService.getTimeFieldRange(
      this._indexPatternName,
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
  private async _updateModelMemoryLimits(
    moduleConfig: Module,
    estimateMML: boolean,
    start?: number,
    end?: number
  ) {
    if (!Array.isArray(moduleConfig.jobs)) {
      return;
    }

    if (estimateMML && this._jobsForModelMemoryEstimation.length > 0) {
      try {
        // Checks if all jobs in the module have the same time field configured
        const firstJobTimeField = this._jobsForModelMemoryEstimation[0].job.config.data_description
          .time_field;
        const isSameTimeFields = this._jobsForModelMemoryEstimation.every(
          ({ job }) => job.config.data_description.time_field === firstJobTimeField
        );

        if (isSameTimeFields && (start === undefined || end === undefined)) {
          // In case of time range is not provided and the time field is the same
          // set the fallback range for all jobs
          // as there may not be a common query, we use a match_all
          const {
            start: fallbackStart,
            end: fallbackEnd,
          } = await this._getFallbackTimeRange(firstJobTimeField, { match_all: {} });
          start = fallbackStart;
          end = fallbackEnd;
        }

        for (const { job, query } of this._jobsForModelMemoryEstimation) {
          let earliestMs = start;
          let latestMs = end;
          if (earliestMs === undefined || latestMs === undefined) {
            const timeFieldRange = await this._getFallbackTimeRange(
              job.config.data_description.time_field,
              query
            );
            earliestMs = timeFieldRange.start;
            latestMs = timeFieldRange.end;
          }

          const { modelMemoryLimit } = await this._calculateModelMemoryLimit(
            job.config.analysis_config,
            this._indexPatternName,
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
        mlLog.warn(
          `Data recognizer could not estimate model memory limit ${JSON.stringify(error.body)}`
        );
      }
    }

    const {
      body: { limits },
    } = await this._mlClient.info<MlInfoResponse>();
    const maxMml = limits.max_model_memory_limit;

    if (!maxMml) {
      return;
    }

    // @ts-expect-error numeral missing value
    const maxBytes: number = numeral(maxMml.toUpperCase()).value();

    for (const job of moduleConfig.jobs) {
      const mml = job.config?.analysis_limits?.model_memory_limit;
      if (mml !== undefined) {
        // @ts-expect-error numeral missing value
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
  private _doSavedObjectsContainIndexPatternId(moduleConfig: Module) {
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

  public applyJobConfigOverrides(
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
      this._jobsForModelMemoryEstimation = [];
    } else {
      this._jobsForModelMemoryEstimation = moduleConfig.jobs
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
        // @ts-expect-error missing job_id
        delete jobSpecificOverride.job_id;
        merge(job.config, jobSpecificOverride);
        processArrayValues(job.config, jobSpecificOverride);
      }
    });
  }

  public applyDatafeedConfigOverrides(
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

      // for some items in the datafeed, we should not merge.
      // we should instead use the whole override object
      function overwriteObjects(source: ModuleDatafeed['config'], update: DatafeedOverride) {
        Object.entries(update).forEach(([key, val]) => {
          if (typeof val === 'object') {
            switch (key) {
              case 'query':
              case 'aggregations':
              case 'aggs':
              case 'script_fields':
                source[key] = val as any;
                break;
              default:
                break;
            }
          }
        });
      }

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
          overwriteObjects(config, o);
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
          overwriteObjects(datafeed.config, o);
        }
      });
    }
  }
}
