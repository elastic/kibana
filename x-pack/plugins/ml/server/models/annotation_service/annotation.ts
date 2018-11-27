/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

import { ML_ANNOTATIONS_INDEX_PATTERN } from '../../../common/constants/index_patterns';

import {
  Annotation,
  Annotations,
  isAnnotation,
  isAnnotations,
} from '../../../common/interfaces/annotations';

interface EsResult {
  _source: object;
  _id: string;
}

interface IndexAnnotationArgs {
  jobIds: string[];
  earliestMs: Date;
  latestMs: Date;
  maxAnnotations: number;
}

interface GetParams {
  index: string;
  size: number;
  body: object;
}

interface GetResponse {
  success: true;
  annotations: {
    [key: string]: Annotations;
  };
}

interface IndexParams {
  index: string;
  type: string;
  body: Annotation;
  refresh?: string;
  id?: string;
}

interface DeleteParams {
  index: string;
  type: string;
  refresh?: string;
  id: string;
}

export function annotationProvider(
  callWithRequest: (action: string, params: IndexParams | DeleteParams | GetParams) => Promise<any>
) {
  async function indexAnnotation(annotation: Annotation) {
    if (isAnnotation(annotation) === false) {
      return Promise.reject(new Error('invalid annotation format'));
    }

    const params: IndexParams = {
      index: '.ml-annotations',
      type: 'annotation',
      body: annotation,
      refresh: 'wait_for',
    };

    if (typeof annotation._id !== 'undefined') {
      params.id = annotation._id;
      delete params.body._id;
    }

    return await callWithRequest('index', params);
  }

  async function getAnnotations({
    jobIds,
    earliestMs,
    latestMs,
    maxAnnotations,
  }: IndexAnnotationArgs) {
    const obj: GetResponse = {
      success: true,
      annotations: {},
    };

    // Build the criteria to use in the bool filter part of the request.
    // Adds criteria for the time range plus any specified job IDs.
    // The nested must_not time range filter queries make sure that we fetch:
    // - annotations with start and end within the time range
    // - annotations that either start or end within the time range
    // - annotations that start before and end after the given time range
    // - but skip annotation that are completely outside the time range
    //   (the ones that start and end before or after the time range)
    const boolCriteria: object[] = [
      {
        bool: {
          must_not: [
            {
              bool: {
                filter: [
                  {
                    range: {
                      timestamp: {
                        lte: earliestMs,
                        format: 'epoch_millis',
                      },
                    },
                  },
                  {
                    range: {
                      end_timestamp: {
                        lte: earliestMs,
                        format: 'epoch_millis',
                      },
                    },
                  },
                ],
              },
            },
            {
              bool: {
                filter: [
                  {
                    range: {
                      timestamp: {
                        gte: latestMs,
                        format: 'epoch_millis',
                      },
                    },
                  },
                  {
                    range: {
                      end_timestamp: {
                        gte: latestMs,
                        format: 'epoch_millis',
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      {
        exists: { field: 'annotation' },
      },
    ];

    if (jobIds && jobIds.length > 0 && !(jobIds.length === 1 && jobIds[0] === '*')) {
      let jobIdFilterStr = '';
      _.each(jobIds, (jobId, i: number) => {
        jobIdFilterStr += `${i! > 0 ? ' OR ' : ''}job_id:${jobId}`;
      });
      boolCriteria.push({
        query_string: {
          analyze_wildcard: false,
          query: jobIdFilterStr,
        },
      });
    }

    const params: GetParams = {
      index: ML_ANNOTATIONS_INDEX_PATTERN,
      size: maxAnnotations,
      body: {
        query: {
          bool: {
            filter: [
              {
                query_string: {
                  query: 'result_type:annotation',
                  analyze_wildcard: false,
                },
              },
              {
                bool: {
                  must: boolCriteria,
                },
              },
            ],
          },
        },
      },
    };

    const resp = await callWithRequest('search', params);

    const docs: Annotations = _.get(resp, ['hits', 'hits'], []).map((d: EsResult) => {
      // get the original source document and the document id, we need it
      // to identify the annotation when editing/deleting it.
      return { ...d._source, _id: d._id } as Annotation;
    });

    if (isAnnotations(docs) === false) {
      throw Boom.badRequest(`Annotations didn't pass integrity check.`);
    }

    docs.forEach((doc: Annotation) => {
      const jobId = doc.job_id;
      if (typeof obj.annotations[jobId] === 'undefined') {
        obj.annotations[jobId] = [];
      }
      obj.annotations[jobId].push(doc);
    });

    return obj;
  }

  async function deleteAnnotation(id: string) {
    const param: DeleteParams = {
      index: '.ml-annotations',
      type: 'annotation',
      id,
      refresh: 'wait_for',
    };

    return await callWithRequest('delete', param);
  }

  return {
    getAnnotations,
    indexAnnotation,
    deleteAnnotation,
  };
}
