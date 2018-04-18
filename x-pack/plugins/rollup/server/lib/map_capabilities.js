/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/

const mapCapabilities = (capabilities, optionalIndexName) => {
  if (!capabilities) {
    return {};
  }

  const indexNameToCapabilitiesMap = {};

  Object.keys(capabilities).forEach(pattern => {
    capabilities[pattern].rollup_jobs.forEach(job => {
      const {
        job_id: jobId,
        rollup_index: rollupIndexName,
        fields,
      } = job;

      // If we're looking for a particular index, ignore ones which don't match.
      if(optionalIndexName && rollupIndexName !== optionalIndexName) {
        return;
      }

      if(!indexNameToCapabilitiesMap[rollupIndexName]) {
        indexNameToCapabilitiesMap[rollupIndexName] = {
          rollup_index: rollupIndexName,
          capabilities: {},
        };
      }

      // Collect capabilities for each job within the index.
      indexNameToCapabilitiesMap[rollupIndexName].capabilities[jobId] = {
        fields,
      };
    });
  });

  return indexNameToCapabilitiesMap;
};

export const getIndexNameToCapabilitiesMap = (capabilities) => {
  return mapCapabilities(capabilities);
};


export const getCapabilitiesForIndexName = (capabilities, indexName) => {
  return mapCapabilities(capabilities, indexName)[indexName].capabilities;
};
