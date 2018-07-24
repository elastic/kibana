/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { difference } from 'lodash';
import chrome from 'ui/chrome';
import { newJobLimits } from 'plugins/ml/jobs/new_job/utils/new_job_defaults';
import { mlJobService } from 'plugins/ml/services/job_service';

export function saveJob(job, newJobData, finish) {

  return new Promise((resolve, reject) => {

    const jobData = {
      ...extractDescription(job, newJobData),
      ...extractGroups(job, newJobData),
      ...extractMML(job, newJobData),
      ...extractDetectorDescriptions(job, newJobData),
      ...extractCustomSettings(job, newJobData),
    };
    const datafeedData = {
      ...extractDatafeed(job, newJobData),
    };

    if (jobData.custom_settings !== undefined) {
      // remove the created_by setting if too much of the job has changed
      jobData.custom_settings =  processCustomSettings(jobData, datafeedData);
    }

    const saveDatafeedWrapper = () => {
      saveDatafeed(datafeedData, job, finish)
        .then(() => {
          resolve();
        })
        .catch((error) => {
          reject(error);
        });
    };

    // if anything has changed, post the changes
    if (Object.keys(jobData).length) {
      mlJobService.updateJob(job.job_id, jobData)
        .then((resp) => {
          if (resp.success) {
            saveDatafeedWrapper();
          } else {
            reject(resp);
          }
        })
        .catch((error) => {
          reject(error);
        });
    } else {
      saveDatafeedWrapper();
    }
  });
}

function saveDatafeed(datafeedData, job) {
  return new Promise((resolve, reject) => {
    if (Object.keys(datafeedData).length) {
      const datafeedId = job.datafeed_config.datafeed_id;
      mlJobService.updateDatafeed(datafeedId, datafeedData)
        .then((resp) => {
          if (resp.success) {
            resolve();
          } else {
            reject(resp);
          }
        });
    } else {
      resolve();
    }
  });
}

export function loadSavedDashboards(maxNumber) {
  // Loads the list of saved dashboards, as used in editing custom URLs.
  return new Promise((resolve, reject) => {

    const savedObjectsClient = chrome.getSavedObjectsClient();
    savedObjectsClient.find({
      type: 'dashboard',
      fields: ['title'],
      perPage: maxNumber
    })
      .then((resp)=> {
        const savedObjects = resp.savedObjects;
        if (savedObjects !== undefined) {
          const dashboards = savedObjects.map(savedObj => {
            return { id: savedObj.id, title: savedObj.attributes.title };
          });

          dashboards.sort((dash1, dash2) => {
            return dash1.title.localeCompare(dash2.title);
          });

          resolve(dashboards);
        }
      })
      .catch((resp) => {
        reject(resp);
      });
  });
}

export function loadIndexPatterns(maxNumber) {
  // Loads the list of Kibana index patterns, as used in editing custom URLs.
  // TODO - amend loadIndexPatterns in index_utils.js to do the request,
  // without needing an Angular Provider.
  return new Promise((resolve, reject) => {

    const savedObjectsClient = chrome.getSavedObjectsClient();
    savedObjectsClient.find({
      type: 'index-pattern',
      fields: ['title'],
      perPage: maxNumber
    })
      .then((resp)=> {
        const savedObjects = resp.savedObjects;
        if (savedObjects !== undefined) {
          const indexPatterns = savedObjects.map(savedObj => {
            return { id: savedObj.id, title: savedObj.attributes.title };
          });

          indexPatterns.sort((dash1, dash2) => {
            return dash1.title.localeCompare(dash2.title);
          });

          resolve(indexPatterns);
        }
      })
      .catch((resp) => {
        reject(resp);
      });
  });
}

function extractDescription(job, newJobData) {
  const description = newJobData.description;
  if (newJobData.description !== job.description) {
    return { description };
  }
  return {};
}

function extractGroups(job, newJobData) {
  const groups = newJobData.groups;
  if (newJobData.groups !== undefined) {
    const diffCount = difference(job.groups, groups).length + difference(groups, job.groups).length;
    return (diffCount === 0) ? {} : { groups };
  }
  return {};
}

function extractMML(job, newJobData) {
  const jobLimits = newJobLimits();
  const mmlData = {};
  // if the job's model_memory_limit has changed, add it to the jobData json
  if (job.analysis_limits.model_memory_limit !== undefined) {
    let { mml } = newJobData;
    // if the user has wiped the mml, use the default value which is
    // displayed greyed out in the field
    if (mml === '') {
      mml = jobLimits.max_model_memory_limit;
    }

    // has the data changed, did analysis_limits never exist for this job
    if (mml !== job.analysis_limits.model_memory_limit) {
      mmlData.analysis_limits = {
        model_memory_limit: mml
      };
    }
  }
  return mmlData;
}

function extractDetectorDescriptions(job, newJobData) {
  const detectors = [];
  const descriptions = newJobData.detectorDescriptions.map((d, i) => ({ detector_index: i, description: d }));

  const originalDetectors = job.analysis_config.detectors;
  originalDetectors.forEach((d) => {
    if (descriptions[d.detector_index].description !== d.detector_description) {
      detectors.push(descriptions[d.detector_index]);
    }
  });

  return (detectors.length) ? { detectors } : {};
}

function extractCustomSettings(job, newJobData) {
  const settingsData = {};
  if (job.custom_settings && newJobData && newJobData.customUrls) {
    settingsData.custom_settings = job.custom_settings;
    settingsData.custom_settings.custom_urls = newJobData.customUrls;
  }
  return settingsData;
}

function extractDatafeed(job, newDatafeedData) {
  const datafeedData = {};
  if (job.datafeed_config !== undefined) {
    const origQueryString = JSON.stringify(job.datafeed_config.query);
    const newQuery = JSON.parse(newDatafeedData.datafeedQuery);
    const newQueryString = JSON.stringify(newQuery);

    if (origQueryString !== newQueryString) {
      datafeedData.query = newQuery;
    }

    if (job.datafeed_config.query_delay !== newDatafeedData.datafeedQueryDelay) {
      datafeedData.query_delay = newDatafeedData.datafeedQueryDelay;
    }

    if (job.datafeed_config.frequency !== newDatafeedData.datafeedFrequency && newDatafeedData.datafeedFrequency !== '') {
      datafeedData.frequency = newDatafeedData.datafeedFrequency;
    }

    if (job.datafeed_config.scroll_size !== newDatafeedData.datafeedScrollSize) {
      datafeedData.scroll_size = newDatafeedData.datafeedScrollSize;
    }

  }

  return datafeedData;
}

function processCustomSettings(jobData, datafeedData) {
  let customSettings = {};
  if (jobData.custom_settings !== undefined) {
    customSettings = { ...jobData.custom_settings };

    if (jobData.custom_settings.created_by !== undefined) {
      if (jobData.detectors !== undefined || Object.keys(datafeedData).length) {
        delete customSettings.created_by;
      }
    }
  }

  return customSettings;
}
