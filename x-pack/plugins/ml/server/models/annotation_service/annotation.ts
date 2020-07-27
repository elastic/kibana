/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import _ from 'lodash';
import { ILegacyScopedClusterClient } from 'kibana/server';

import { ANNOTATION_EVENT_USER, ANNOTATION_TYPE } from '../../../common/constants/annotations';
import { PARTITION_FIELDS } from '../../../common/constants/anomalies';
import {
  ML_ANNOTATIONS_INDEX_ALIAS_READ,
  ML_ANNOTATIONS_INDEX_ALIAS_WRITE,
} from '../../../common/constants/index_patterns';

import {
  Annotation,
  Annotations,
  isAnnotation,
  isAnnotations,
  getAnnotationFieldName,
  getAnnotationFieldValue,
  EsAggregationResult,
} from '../../../common/types/annotations';

// TODO All of the following interface/type definitions should
// eventually be replaced by the proper upstream definitions
interface EsResult {
  _source: Annotation;
  _id: string;
}

export interface FieldToBucket {
  field: string;
  missing?: string | number;
}

export interface IndexAnnotationArgs {
  jobIds: string[];
  earliestMs: number;
  latestMs: number;
  maxAnnotations: number;
  fields?: FieldToBucket[];
  detectorIndex?: number;
  entities?: any[];
}

export interface AggTerm {
  terms: FieldToBucket;
}

export interface GetParams {
  index: string;
  size: number;
  body: object;
}

export interface GetResponse {
  success: true;
  annotations: Record<string, Annotations>;
  aggregations: EsAggregationResult;
}

export interface IndexParams {
  index: string;
  body: Annotation;
  refresh?: string;
  id?: string;
}

export interface DeleteParams {
  index: string;
  refresh?: string;
  id: string;
}

export function annotationProvider({ callAsCurrentUser }: ILegacyScopedClusterClient) {
  async function indexAnnotation(annotation: Annotation, username: string) {
    if (isAnnotation(annotation) === false) {
      // No need to translate, this will not be exposed in the UI.
      return Promise.reject(new Error('invalid annotation format'));
    }

    if (annotation.create_time === undefined) {
      annotation.create_time = new Date().getTime();
      annotation.create_username = username;
    }

    annotation.modified_time = new Date().getTime();
    annotation.modified_username = username;

    const params: IndexParams = {
      index: ML_ANNOTATIONS_INDEX_ALIAS_WRITE,
      body: annotation,
      refresh: 'wait_for',
    };

    if (typeof annotation._id !== 'undefined') {
      params.id = annotation._id;
      delete params.body._id;
      delete params.body.key;
    }

    return await callAsCurrentUser('index', params);
  }

  async function getAnnotations({
    jobIds,
    earliestMs,
    latestMs,
    maxAnnotations,
    fields,
    detectorIndex,
    entities,
  }: IndexAnnotationArgs) {
    const obj: GetResponse = {
      success: true,
      annotations: {},
      aggregations: {},
    };

    const boolCriteria: object[] = [];

    // Build the criteria to use in the bool filter part of the request.
    // Adds criteria for the time range plus any specified job IDs.
    // The nested must_not time range filter queries make sure that we fetch:
    // - annotations with start and end within the time range
    // - annotations that either start or end within the time range
    // - annotations that start before and end after the given time range
    // - but skip annotation that are completely outside the time range
    //   (the ones that start and end before or after the time range)
    if (earliestMs !== null && latestMs !== null) {
      boolCriteria.push({
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
      });
    }

    boolCriteria.push({
      exists: { field: 'annotation' },
    });

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

    // Find unique buckets (e.g. events) from the queried annotations to show in dropdowns
    const aggs: Record<string, AggTerm> = {};
    if (fields) {
      fields.forEach((fieldToBucket) => {
        aggs[fieldToBucket.field] = {
          terms: {
            ...fieldToBucket,
          },
        };
      });
    }

    // Build should clause to further query for annotations in SMV
    // we want to show either the exact match with detector index and by/over/partition fields
    // OR annotations without any partition fields defined
    let shouldClauses;
    if (detectorIndex !== undefined && Array.isArray(entities)) {
      // build clause to get exact match of detector index and by/over/partition fields
      const beExactMatch = [];
      beExactMatch.push({
        term: {
          detector_index: detectorIndex,
        },
      });

      entities.forEach(({ fieldName, fieldType, fieldValue }) => {
        beExactMatch.push({
          term: {
            [getAnnotationFieldName(fieldType)]: fieldName,
          },
        });
        beExactMatch.push({
          term: {
            [getAnnotationFieldValue(fieldType)]: fieldValue,
          },
        });
      });

      // clause to get annotations that have no partition fields
      const haveAnyPartitionFields: object[] = [];
      PARTITION_FIELDS.forEach((field) => {
        haveAnyPartitionFields.push({
          exists: {
            field: getAnnotationFieldName(field),
          },
        });
        haveAnyPartitionFields.push({
          exists: {
            field: getAnnotationFieldValue(field),
          },
        });
      });
      shouldClauses = [
        { bool: { must_not: haveAnyPartitionFields } },
        { bool: { must: beExactMatch } },
      ];
    }

    const params: GetParams = {
      index: ML_ANNOTATIONS_INDEX_ALIAS_READ,
      size: maxAnnotations,
      body: {
        query: {
          bool: {
            filter: [
              {
                query_string: {
                  query: `type:${ANNOTATION_TYPE.ANNOTATION}`,
                  analyze_wildcard: false,
                },
              },
              {
                bool: {
                  must: boolCriteria,
                },
              },
            ],
            ...(shouldClauses ? { should: shouldClauses, minimum_should_match: 1 } : {}),
          },
        },
        ...(fields ? { aggs } : {}),
      },
    };

    try {
      const resp = await callAsCurrentUser('search', params);

      if (resp.error !== undefined && resp.message !== undefined) {
        // No need to translate, this will not be exposed in the UI.
        throw new Error(`Annotations couldn't be retrieved from Elasticsearch.`);
      }

      const docs: Annotations = _.get(resp, ['hits', 'hits'], []).map((d: EsResult) => {
        // get the original source document and the document id, we need it
        // to identify the annotation when editing/deleting it.
        // if original `event` is undefined then substitute with 'user` by default
        // since annotation was probably generated by user on the UI
        return {
          ...d._source,
          event: d._source?.event ?? ANNOTATION_EVENT_USER,
          _id: d._id,
        } as Annotation;
      });

      const aggregations = _.get(resp, ['aggregations'], {}) as EsAggregationResult;
      if (fields) {
        obj.aggregations = aggregations;
      }
      if (isAnnotations(docs) === false) {
        // No need to translate, this will not be exposed in the UI.
        throw new Error(`Annotations didn't pass integrity check.`);
      }

      docs.forEach((doc: Annotation) => {
        const jobId = doc.job_id;
        if (typeof obj.annotations[jobId] === 'undefined') {
          obj.annotations[jobId] = [];
        }
        obj.annotations[jobId].push(doc);
      });

      return obj;
    } catch (error) {
      throw Boom.badRequest(error);
    }
  }

  async function deleteAnnotation(id: string) {
    const param: DeleteParams = {
      index: ML_ANNOTATIONS_INDEX_ALIAS_WRITE,
      id,
      refresh: 'wait_for',
    };

    return await callAsCurrentUser('delete', param);
  }

  return {
    getAnnotations,
    indexAnnotation,
    deleteAnnotation,
  };
}
