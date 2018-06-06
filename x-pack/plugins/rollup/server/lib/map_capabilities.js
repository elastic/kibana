/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/
export const mapCapabilities = (capabilities, index) => {
  const capabilitiesByIndex = {};

  if(capabilities) {
    Object.keys(capabilities).forEach(pattern => {
      capabilities[pattern].rollup_jobs.forEach(job => {
        if(index && job.rollup_index !== index) {
          return;
        }

        if(!capabilitiesByIndex[job.rollup_index]) {
          capabilitiesByIndex[job.rollup_index] = {
            rollup_index: job.rollup_index,
            capabilities: {},
          };
        }

        capabilitiesByIndex[job.rollup_index].capabilities[job.job_id] = {
          fields: job.fields,
        };
      });
    });
  }

  return capabilitiesByIndex;
};
