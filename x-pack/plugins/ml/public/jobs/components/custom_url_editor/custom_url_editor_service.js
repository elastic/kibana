/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



// Service for obtaining information for the custom URL editor.

import { parseInterval } from 'ui/utils/parse_interval';

import { ML_RESULTS_INDEX_PATTERN } from 'plugins/ml/constants/index_patterns';
import { replaceTokensInUrlValue } from 'plugins/ml/util/custom_url_utils';

export function CustomUrlEditorServiceProvider(es, mlJobService, $q) {

  // Builds the full URL for testing out a custom URL configuration, which
  // may contain dollar delimited partition / influencer entity tokens and
  // drilldown time range settings.
  function getTestUrl(job, urlConfig) {
    const urlValue = urlConfig.url_value;
    const bucketSpanSecs = parseInterval(job.analysis_config.bucket_span).asSeconds();

    // By default, return configured url_value. Look to substitute any dollar-delimited
    // tokens with values from the highest scoring anomaly, or if no anomalies, with
    // values from a document returned by the search in the job datafeed.
    let testUrl = urlConfig.url_value;

    // Query to look for the highest scoring anomaly.
    const body = {
      query: {
        bool: {
          must: [
            { term: { job_id: job.job_id } },
            { term: { result_type: 'record' } }
          ]
        }
      },
      size: 1,
      _source: {
        excludes: []
      },
      sort: [
        { record_score: { order: 'desc' } }
      ]
    };

    return $q((resolve, reject) => {
      es.search({
        index: ML_RESULTS_INDEX_PATTERN,
        body
      })
        .then((resp) => {
          if (resp.hits.total > 0) {
            const record = resp.hits.hits[0]._source;
            testUrl = replaceTokensInUrlValue(urlConfig, bucketSpanSecs, record, 'timestamp');
            resolve(testUrl);
          } else {
            // No anomalies yet for this job, so do a preview of the search
            // configured in the job datafeed to obtain sample docs.
            mlJobService.searchPreview(job)
              .then((response) => {
                let testDoc;
                const docTimeFieldName = job.data_description.time_field;

                // Handle datafeeds which use aggregations or documents.
                if (response.aggregations) {
                  // Create a dummy object which contains the fields necessary to build the URL.
                  const firstBucket = response.aggregations.buckets.buckets[0];
                  testDoc = {
                    [docTimeFieldName]: firstBucket.key
                  };

                  // Look for bucket aggregations which match the tokens in the URL.
                  urlValue.replace((/\$([^?&$\'"]{1,40})\$/g), (match, name) => {
                    if (name !== 'earliest' && name !== 'latest' && firstBucket[name] !== undefined) {
                      const tokenBuckets = firstBucket[name];
                      if (tokenBuckets.buckets) {
                        testDoc[name] = tokenBuckets.buckets[0].key;
                      }
                    }
                  });

                } else {
                  if (response.hits.total > 0) {
                    testDoc = response.hits.hits[0]._source;
                  }
                }

                if (testDoc !== undefined) {
                  testUrl = replaceTokensInUrlValue(urlConfig, bucketSpanSecs, testDoc, docTimeFieldName);
                }

                resolve(testUrl);

              });
          }

        })
        .catch((resp) => {
          reject(resp);
        });
    });

  }


  return {
    getTestUrl
  };
}
