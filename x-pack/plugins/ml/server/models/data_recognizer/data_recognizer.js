/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import fs from 'fs';
import Boom from 'boom';
import { prefixDatafeedId } from '../../../common/util/job_utils';

const ML_DIR = 'ml';
const KIBANA_DIR = 'kibana';
const INDEX_PATTERN_ID = 'INDEX_PATTERN_ID';
const INDEX_PATTERN_NAME = 'INDEX_PATTERN_NAME';

export class DataRecognizer {
  constructor(callWithRequest) {
    this.callWithRequest = callWithRequest;
    this.modulesDir = `${__dirname}/modules`;
    this.savedObjectsClient = null;
  }

  // list all directories under the given directory
  async listDirs(dirName) {
    const dirs = [];
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

  async readFile(fileName) {
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

  async loadManifestFiles() {
    const configs = [];
    const dirs = await this.listDirs(this.modulesDir);
    await Promise.all(dirs.map(async (dir) => {
      const file = await this.readFile(`${this.modulesDir}/${dir}/manifest.json`);
      configs.push({
        dirName: dir,
        json: JSON.parse(file)
      });
    }));

    return configs;
  }

  // get the manifest.json file for a specified id, e.g. "nginx"
  async getManifestFile(id) {
    const manifestFiles = await this.loadManifestFiles();
    return manifestFiles.find(i => i.json.id === id);
  }

  // called externally by an endpoint
  async findMatches(indexPattern) {
    const manifestFiles = await this.loadManifestFiles();
    const results = [];

    await Promise.all(manifestFiles.map(async (i) => {
      const moduleConfig = i.json;
      const match = await this.searchForFields(moduleConfig, indexPattern);
      if (match) {
        let logo = null;
        if (moduleConfig.logoFile) {
          try {
            logo = await this.readFile(`${this.modulesDir}/${i.dirName}/${moduleConfig.logoFile}`);
            logo = JSON.parse(logo);
          } catch(e) {
            logo = null;
          }
        }
        results.push({
          id: moduleConfig.id,
          title: moduleConfig.title,
          query: moduleConfig.query,
          description: moduleConfig.description,
          logo
        });
      }
    }));

    return results;
  }

  async searchForFields(moduleConfig, indexPattern) {
    const index = indexPattern;
    const size = 0;
    const body = {
      query: moduleConfig.query
    };

    const resp = await this.callWithRequest('search', { index, size, body });
    return (resp.hits.total !== 0);
  }

  // called externally by an endpoint
  // supplying an optional prefix will add the prefix
  // to the job and datafeed configs
  async getModule(id, prefix = '') {
    let manifestJSON = null;
    let dirName = null;

    const manifestFile = await this.getManifestFile(id);
    if (manifestFile !== undefined) {
      manifestJSON = manifestFile.json;
      dirName = manifestFile.dirName;
    }
    else {
      return Boom.notFound(`Module with the id "${id}" not found`);
    }

    const jobs = [];
    const datafeeds = [];
    const kibana = {};
    // load all of the job configs
    await Promise.all(manifestJSON.jobs.map(async (job) => {
      const jobConfig = await this.readFile(`${this.modulesDir}/${dirName}/${ML_DIR}/${job.file}`);
      // use the file name for the id
      jobs.push({
        id: `${prefix}${job.id}`,
        config: JSON.parse(jobConfig)
      });
    }));

    // load all of the datafeed configs
    await Promise.all(manifestJSON.datafeeds.map(async (datafeed) => {
      const datafeedConfig = await this.readFile(`${this.modulesDir}/${dirName}/${ML_DIR}/${datafeed.file}`);
      const config = JSON.parse(datafeedConfig);
      // use the job id from the manifestFile
      config.job_id = `${prefix}${datafeed.job_id}`;

      datafeeds.push({
        id: prefixDatafeedId(datafeed.id, prefix),
        config
      });
    }));

    // load all of the kibana saved objects
    const kKeys = Object.keys(manifestJSON.kibana);
    await Promise.all(kKeys.map(async (key) => {
      kibana[key] = [];
      await Promise.all(manifestJSON.kibana[key].map(async (obj) => {
        const kConfig = await this.readFile(`${this.modulesDir}/${dirName}/${KIBANA_DIR}/${key}/${obj.file}`);
        // use the file name for the id
        const kId = obj.file.replace('.json', '');
        const config = JSON.parse(kConfig);
        kibana[key].push({
          id: kId,
          title: config.title,
          config
        });
      }));
    }));

    return {
      jobs,
      datafeeds,
      kibana
    };
  }

  // called externally by an endpoint
  // takes a module config id, an optional jobPrefix and the request object
  // creates all of the jobs, datafeeds and savedObjects  listed in the module config.
  // if any of the savedObjects already exist, they will not be overwritten.
  async setupModuleItems(moduleId, jobPrefix, groups, indexPatternName, request) {
    this.savedObjectsClient = request.getSavedObjectsClient();
    this.indexPatterns = await this.loadIndexPatterns();

    // load the config from disk
    const moduleConfig = await this.getModule(moduleId, jobPrefix);
    const manifestFile = await this.getManifestFile(moduleId);

    if (indexPatternName === undefined &&
      manifestFile && manifestFile.json &&
      manifestFile.json.defaultIndexPattern === undefined) {

      return Boom.badRequest(`No index pattern configured in "${moduleId}" configuration file and no index pattern passed to the endpoint`);
    }
    this.indexPatternName = (indexPatternName === undefined) ? manifestFile.json.defaultIndexPattern : indexPatternName;
    this.indexPatternId = this.getIndexPatternId(this.indexPatternName);

    // create an empty results object
    const results = this.createResultsTemplate(moduleConfig);
    const saveResults = {
      jobs: [],
      datafeeds: [],
      savedObjects: []
    };
    this.updateDatafeedIndices(moduleConfig);
    this.updateJobUrlIndexPatterns(moduleConfig);

    // create the jobs
    if (moduleConfig.jobs && moduleConfig.jobs.length) {
      if (Array.isArray(groups)) {
        // update groups list for each job
        moduleConfig.jobs.forEach(job => job.config.groups = groups);
      }
      saveResults.jobs = await this.saveJobs(moduleConfig.jobs);
    }

    // create the datafeeds
    if (moduleConfig.datafeeds && moduleConfig.datafeeds.length) {
      saveResults.datafeeds = await this.saveDatafeeds(moduleConfig.datafeeds);
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

  async loadIndexPatterns() {
    return await this.savedObjectsClient.find({ type: 'index-pattern', perPage: 1000 });
  }

  // returns a id based on an index pattern name
  getIndexPatternId(name) {
    if (this.indexPatterns && this.indexPatterns.saved_objects) {
      const ip = this.indexPatterns.saved_objects.find((i) => i.attributes.title === name);
      return (ip !== undefined) ? ip.id : undefined;
    } else {
      return undefined;
    }
  }

  // create a list of objects which are used to save the savedObjects.
  // each has an exists flag and those which do not already exist
  // contain a savedObject object which is sent to the server to save
  async createSavedObjectsToSave(moduleConfig) {
    // first check if the saved objects already exist.
    const savedObjectExistResults = await this.checkIfSavedObjectsExist(moduleConfig.kibana, this.request);
    // loop through the kibanaSaveResults and update
    Object.keys(moduleConfig.kibana).forEach((type) => {
      // type e.g. dashboard, search ,visualization
      moduleConfig.kibana[type].forEach((configItem) => {
        const existsResult = savedObjectExistResults.find(o => o.id === configItem.id);
        if (existsResult !== undefined) {
          configItem.exists = existsResult.exists;
          if (existsResult.exists === false) {
            // if this object doesn't already exist, create the savedObject
            // which will be used to create it
            existsResult.savedObject = {
              type,
              id: configItem.id,
              attributes: configItem.config
            };
          }
        }
      });
    });
    return savedObjectExistResults;
  }

  // update the exists flags in the kibana results
  updateKibanaResults(kibanaSaveResults, objectExistResults) {
    Object.keys(kibanaSaveResults).forEach((type) => {
      kibanaSaveResults[type].forEach((resultItem) => {
        const i = objectExistResults.find(o => (o.id === resultItem.id && o.type === type));
        resultItem.exists = (i !== undefined);
      });
    });
  }

  // loop through each type (dashboard, search, visualization)
  // load existing savedObjects for each type and compare to find out if
  // items with the same id already exist.
  // returns a flat list of objects with exists flags set
  async checkIfSavedObjectsExist(kibanaObjects) {
    const types = Object.keys(kibanaObjects);
    const results = await Promise.all(types.map(async (type) => {
      const existingObjects = await this.loadExistingSavedObjects(type);
      return kibanaObjects[type].map((obj) => {
        const existingObject = existingObjects.saved_objects.find(o => (o.attributes && o.attributes.title === obj.title));
        return {
          id: obj.id,
          type,
          exists: (existingObject !== undefined)
        };
      });
    }));
    // merge all results
    return [].concat(...results);
  }

  // find all existing savedObjects for a given type
  loadExistingSavedObjects(type) {
    return this.savedObjectsClient.find({ type, perPage: 1000 });
  }

  // save the savedObjects if they do not exist already
  async saveKibanaObjects(objectExistResults) {
    let results = [];
    const filteredSavedObjects = objectExistResults.filter(o => o.exists === false).map(o => o.savedObject);
    if (filteredSavedObjects.length) {
      results = await this.savedObjectsClient.bulkCreate(filteredSavedObjects);
    }
    return results;
  }

  // save the jobs.
  // if any fail (e.g. it already exists), catch the error and mark the result
  // as success: false
  async saveJobs(jobs) {
    return await Promise.all(jobs.map(async (job) => {
      const jobId = job.id;
      try {
        job.id = jobId;
        await this.saveJob(job);
        return { id: jobId, success: true };
      } catch (error) {
        return { id: jobId, success: false, error };
      }
    }));
  }

  async saveJob(job) {
    const { id: jobId, config: body } = job;
    return this.callWithRequest('ml.addJob', { jobId, body });
  }

  // save the datafeeds.
  // if any fail (e.g. it already exists), catch the error and mark the result
  // as success: false
  async saveDatafeeds(datafeeds) {
    return await Promise.all(datafeeds.map(async (datafeed) => {
      const datafeedId = datafeed.id;

      try {
        datafeed.id = datafeedId;
        await this.saveDatafeed(datafeed);
        return { id: datafeedId, success: true };
      } catch (error) {
        return { id: datafeedId, success: false, error };
      }
    }));
  }

  async saveDatafeed(datafeed) {
    const { id: datafeedId, config: body } = datafeed;
    return this.callWithRequest('ml.addDatafeed', { datafeedId, body });
  }

  // merge all of the save results into one result object
  // which is returned from the endpoint
  async updateResults(results, saveResults) {
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
          if (d2.error !== undefined) {
            d.error = d2.error;
          }
        }
      });
    });

    // update savedObjects results
    Object.keys(results.kibana).forEach((category) => {
      results.kibana[category].forEach((item) => {
        const result = saveResults.savedObjects.find(o => o.id === item.id);
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
    });
  }

  // creates an empty results object,
  // listing each job/datafeed/savedObject with a save success boolean
  createResultsTemplate(moduleConfig) {
    const results = {};
    function createResultsItems(configItems, resultItems, index) {
      resultItems[index] = [];
      configItems.forEach((j) => {
        resultItems[index].push({
          id: j.id,
          success: false
        });
      });
    }

    Object.keys(moduleConfig).forEach((i) => {
      if (Array.isArray(moduleConfig[i])) {
        createResultsItems(moduleConfig[i], results, i);
      } else {
        results[i] = {};
        Object.keys(moduleConfig[i]).forEach((k) => {
          createResultsItems(moduleConfig[i][k], results[i], k);
        });
      }
    });
    return results;
  }

  // if an override index pattern has been specified,
  // update all of the datafeeds.
  updateDatafeedIndices(moduleConfig) {
    // only use the override index pattern if it actually exists in kibana
    const idxId = this.getIndexPatternId(this.indexPatternName);
    if (idxId !== undefined) {
      moduleConfig.datafeeds.forEach((df) => {
        df.config.indexes = df.config.indexes.map(idx => (idx === INDEX_PATTERN_NAME ? this.indexPatternName : idx));
      });
    }
  }

  // loop through the custom urls in each job and replace the INDEX_PATTERN_ID
  // marker for the id of the specified index pattern
  updateJobUrlIndexPatterns(moduleConfig) {
    if (moduleConfig.jobs && moduleConfig.jobs.length) {
      // find the job associated with the datafeed
      moduleConfig.jobs.forEach((job) => {
        // if the job has custom_urls
        if (job.config.custom_settings && job.config.custom_settings.custom_urls) {
          // loop through each url, replacing the INDEX_PATTERN_ID marker
          job.config.custom_settings.custom_urls.forEach((cUrl) => {
            const url = cUrl.url_value;
            if (url.match(INDEX_PATTERN_ID)) {
              const newUrl = url.replace(new RegExp(INDEX_PATTERN_ID, 'g'), this.indexPatternId);
              // update the job's url
              cUrl.url_value = newUrl;
            }
          });
        }
      });
    }
  }

  // loop through each kibana saved objects and replace the INDEX_PATTERN_ID
  // marker for the id of the specified index pattern
  updateSavedObjectIndexPatterns(moduleConfig) {
    if (moduleConfig.kibana) {
      Object.keys(moduleConfig.kibana).forEach((category) => {
        moduleConfig.kibana[category].forEach((item) => {
          let jsonString = item.config.kibanaSavedObjectMeta.searchSourceJSON;
          if (jsonString.match(INDEX_PATTERN_ID)) {
            jsonString = jsonString.replace(new RegExp(INDEX_PATTERN_ID, 'g'), this.indexPatternId);
            item.config.kibanaSavedObjectMeta.searchSourceJSON = jsonString;
          }
        });
      });
    }
  }

}
