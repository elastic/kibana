/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import _ from 'lodash';

import 'ui/courier';
import { mlFunctionToESAggregation } from 'plugins/ml/../common/util/job_utils';
import { getIndexPatternProvider } from 'plugins/ml/util/index_utils';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

// Service for accessing FieldFormat objects configured for a Kibana index pattern
// for use in formatting the actual and typical values from anomalies.
module.service('mlFieldFormatService', function (
  $q,
  courier,
  Private,
  mlJobService) {

  const indexPatternIdsByJob = {};
  const formatsByJob = {};

  const getIndexPattern = Private(getIndexPatternProvider);

  // Populate the service with the FieldFormats for the list of jobs with the
  // specified IDs. List of Kibana index patterns is passed, with a title
  // attribute set in each pattern which will be compared to the index pattern
  // configured in the datafeed of each job.
  // Builds a map of Kibana FieldFormats (ui/field_formats/field_format.js)
  // against detector index by job ID.
  this.populateFormats = function (jobIds, indexPatterns) {
    const deferred = $q.defer();

    // Populate a map of index pattern IDs against job ID, by finding the ID of the index
    // pattern with a title attribute which matches the index configured in the datafeed.
    // If a Kibana index pattern has not been created
    // for this index, then no custom field formatting will occur.
    _.each(jobIds, (jobId) => {
      const jobObj = mlJobService.getJob(jobId);
      const datafeedIndices = jobObj.datafeed_config.indices;
      const indexPattern = _.find(indexPatterns, (index) => {
        return _.find(datafeedIndices, (datafeedIndex) => {
          return index.get('title') === datafeedIndex;
        });
      });

      // Check if index pattern has been configured to match the index in datafeed.
      if (indexPattern !== undefined) {
        indexPatternIdsByJob[jobId] = indexPattern.id;
      }
    });

    const promises = jobIds.map(jobId => $q.all([
      getFormatsForJob(jobId)
    ]));

    $q.all(promises).then((fmtsByJobByDetector) => {
      _.each(fmtsByJobByDetector, (formatsByDetector, index) => {
        formatsByJob[jobIds[index]] = formatsByDetector[0];
      });

      deferred.resolve(formatsByJob);
    }).catch(err => {
      console.log('mlFieldFormatService error populating formats:', err);
      deferred.reject({ formats: {}, err });
    });

    return deferred.promise;

  };

  // Return the FieldFormat to use for formatting values from
  // the detector from the job with the specified ID.
  this.getFieldFormat = function (jobId, detectorIndex) {
    return _.get(formatsByJob, [jobId, detectorIndex]);
  };


  // Utility for returning the FieldFormat from a full populated Kibana index pattern object
  // containing the list of fields by name with their formats.
  this.getFieldFormatFromIndexPattern = function (fullIndexPattern, fieldName, esAggName) {
    // Don't use the field formatter for distinct count detectors as
    // e.g. distinct_count(clientip) should be formatted as a count, not as an IP address.
    let fieldFormat = undefined;
    if (esAggName !== 'cardinality') {
      const indexPatternFields = _.get(fullIndexPattern, 'fields.byName', []);
      fieldFormat = _.get(indexPatternFields, [fieldName, 'format']);
    }

    return fieldFormat;
  };

  function getFormatsForJob(jobId) {
    const deferred = $q.defer();

    const jobObj = mlJobService.getJob(jobId);
    const detectors = jobObj.analysis_config.detectors || [];
    const formatsByDetector = {};

    const indexPatternId = indexPatternIdsByJob[jobId];
    if (indexPatternId !== undefined) {
      // Load the full index pattern configuration to obtain the formats of each field.
      getIndexPattern(indexPatternId)
        .then((indexPatternData) => {
          // Store the FieldFormat for each job by detector_index.
          const fieldsByName = _.get(indexPatternData, 'fields.byName', []);
          _.each(detectors, (dtr) => {
            const esAgg = mlFunctionToESAggregation(dtr.function);
            // distinct_count detectors should fall back to the default
            // formatter as the values are just counts.
            if (dtr.field_name !== undefined && esAgg !== 'cardinality') {
              formatsByDetector[dtr.detector_index] = _.get(fieldsByName, [dtr.field_name, 'format']);
            }
          });

          deferred.resolve(formatsByDetector);
        }).catch(err => {
          deferred.reject(err);
        });

      return deferred.promise;
    } else {
      deferred.resolve(formatsByDetector);
    }

  }

});
