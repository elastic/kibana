/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { newJobLimits } from 'plugins/ml/jobs/new_job/utils/new_job_defaults';
import { mlJobService } from 'plugins/ml/services/job_service';

export function saveJob(job, newJobData, finish) {

  return new Promise((resolve, reject) => {

    const jobData = {
      ...extractDescription(job, newJobData),
      ...extractGroups(job, newJobData),
      ...extractMML(job, newJobData),
      ...extractDetectorDescriptions(job, newJobData),
    };
    const datafeedData = {
      ...extractDatafeed(job, newJobData),
    };

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
            reject();
          }
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
    return { groups };
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
  // let changes = 0;
  const originalDetectors = job.analysis_config.detectors;
  originalDetectors.forEach((d) => {
    if (descriptions[d.detector_index].description !== d.detector_description) {
      detectors.push(descriptions[d.detector_index]);
    }
  });

  return (detectors.length) ? { detectors } : {};
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
