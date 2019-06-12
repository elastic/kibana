/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



// calculates the size of the model memory limit used in the job config
// based on the cardinality of the field being used to split the data.
// the limit should be 10MB plus 20kB per series, rounded up to the nearest MB.
import numeral from '@elastic/numeral';
import { fieldsServiceProvider } from '../fields_service';

export function calculateModelMemoryLimitProvider(callWithRequest) {
  const fieldsService = fieldsServiceProvider(callWithRequest);

  return function calculateModelMemoryLimit(
    indexPattern,
    splitFieldName,
    query,
    fieldNames,
    influencerNames,
    timeFieldName,
    earliestMs,
    latestMs,
    allowMMLGreaterThanMax = false) {
    return new Promise((response, reject) => {
      const limits = {};
      callWithRequest('ml.info')
      	.then((resp) => {
          if (resp.limits !== undefined && resp.limits.max_model_memory_limit !== undefined) {
            limits.max_model_memory_limit = resp.limits.max_model_memory_limit;
          }
        })
        .catch((error) => {
          reject(error);
        });

      // find the cardinality of the split field
      function splitFieldCardinality() {
        return fieldsService.getCardinalityOfFields(
          indexPattern,
          [splitFieldName],
          query,
          timeFieldName,
          earliestMs,
          latestMs
        );
      }

      // find the cardinality of an influencer field
      function influencerCardinality(influencerName) {
        return fieldsService.getCardinalityOfFields(
          indexPattern,
          [influencerName],
          query,
          timeFieldName,
          earliestMs,
          latestMs
        );
      }

      const calculations = [
        splitFieldCardinality(),
        ...(influencerNames.map(inf => influencerCardinality(inf)))
      ];

      Promise.all(calculations).then((responses) => {
        let mmlMB = 0;
        const MB = 1000;
        responses.forEach((resp, i) => {
          let mmlKB = 0;
          if (i === 0) {
            // first in the list is the basic calculation.
            // a base of 10MB plus 64KB per series per detector
            // i.e. 10000KB + (64KB * cardinality of split field * number or detectors)
            const cardinality = resp[splitFieldName];
            mmlKB = 10000;
            const SERIES_MULTIPLIER = 64;
            const numberOfFields = fieldNames.length;

            if (cardinality !== undefined) {
              mmlKB += ((SERIES_MULTIPLIER * cardinality) * numberOfFields);
            }

          } else {
            // the rest of the calculations are for influencers fields
            // 10KB per series of influencer field
            // i.e. 10KB * cardinality of influencer field
            const cardinality = resp[splitFieldName];
            mmlKB = 0;
            const SERIES_MULTIPLIER = 10;
            if (cardinality !== undefined) {
              mmlKB = (SERIES_MULTIPLIER * cardinality);
            }
          }
          // convert the total to MB, rounding up.
          mmlMB += Math.ceil(mmlKB / MB);
        });

        // if max_model_memory_limit has been set,
        // make sure the estimated value is not greater than it.
        if (allowMMLGreaterThanMax === false && limits.max_model_memory_limit !== undefined) {
          const maxBytes = numeral(limits.max_model_memory_limit.toUpperCase()).value();
          const mmlBytes = numeral(`${mmlMB}MB`).value();
          if (mmlBytes > maxBytes) {
            mmlMB = Math.floor(maxBytes / numeral('1MB').value());
          }
        }
        response({ modelMemoryLimit: `${mmlMB}MB` });
      })
        .catch((error) => {
          reject(error);
        });
    });
  };

}
