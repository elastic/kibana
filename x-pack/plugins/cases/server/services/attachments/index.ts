/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Logger,
  SavedObject,
  SavedObjectReference,
  SavedObjectsClientContract,
  SavedObjectsUpdateOptions,
} from '@kbn/core/server';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { KueryNode } from '@kbn/es-query';
import {
  AttributesTypeAlerts,
  CommentAttributes as AttachmentAttributes,
  CommentPatchAttributes as AttachmentPatchAttributes,
  CommentType,
} from '../../../common/api';
import {
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  MAX_DOCS_PER_PAGE,
} from '../../../common/constants';
import { ClientArgs } from '..';
import { buildFilter, combineFilters } from '../../client/utils';
import { defaultSortField } from '../../common/utils';
import { AggregationResponse } from '../../client/metrics/types';
interface AttachedToCaseArgs extends ClientArgs {
  caseId: string;
  filter?: KueryNode;
}

type GetAllAlertsAttachToCaseArgs = AttachedToCaseArgs;
type AlertsAttachedToCaseArgs = AttachedToCaseArgs;

interface AttachmentsAttachedToCaseArgs extends AttachedToCaseArgs {
  attachmentType: CommentType;
  aggregations: Record<string, estypes.AggregationsAggregationContainer>;
}

interface CountActionsAttachedToCaseArgs extends AttachedToCaseArgs {
  aggregations: Record<string, estypes.AggregationsAggregationContainer>;
}

interface GetAttachmentArgs extends ClientArgs {
  attachmentId: string;
}

interface CreateAttachmentArgs extends ClientArgs {
  attributes: AttachmentAttributes;
  references: SavedObjectReference[];
  id: string;
}

interface BulkCreateAttachments extends ClientArgs {
  attachments: Array<{
    attributes: AttachmentAttributes;
    references: SavedObjectReference[];
    id: string;
  }>;
}

interface UpdateArgs {
  attachmentId: string;
  updatedAttributes: AttachmentPatchAttributes;
  options?: SavedObjectsUpdateOptions<AttachmentAttributes>;
}

export type UpdateAttachmentArgs = UpdateArgs & ClientArgs;

interface BulkUpdateAttachmentArgs extends ClientArgs {
  comments: UpdateArgs[];
}

interface CommentStats {
  nonAlerts: number;
  alerts: number;
}

export class AttachmentService {
  constructor(private readonly log: Logger) {}

  public async countAlertsAttachedToCase(
    params: AlertsAttachedToCaseArgs
  ): Promise<number | undefined> {
    try {
      this.log.debug(`Attempting to count alerts for case id ${params.caseId}`);
      const res = await this.executeCaseAggregations<{ alerts: { value: number } }>({
        ...params,
        attachmentType: CommentType.alert,
        aggregations: this.buildAlertsAggs('cardinality'),
      });

      return res?.alerts?.value;
    } catch (error) {
      this.log.error(`Error while counting alerts for case id ${params.caseId}: ${error}`);
      throw error;
    }
  }

  private buildAlertsAggs(agg: string): Record<string, estypes.AggregationsAggregationContainer> {
    return {
      alerts: {
        [agg]: {
          field: `${CASE_COMMENT_SAVED_OBJECT}.attributes.alertId`,
        },
      },
    };
  }

  public async valueCountAlertsAttachedToCase(params: AlertsAttachedToCaseArgs): Promise<number> {
    try {
      this.log.debug(`Attempting to value count alerts for case id ${params.caseId}`);
      const res = await this.executeCaseAggregations<{ alerts: { value: number } }>({
        ...params,
        attachmentType: CommentType.alert,
        aggregations: this.buildAlertsAggs('value_count'),
      });

      return res?.alerts?.value ?? 0;
    } catch (error) {
      this.log.error(`Error while value counting alerts for case id ${params.caseId}: ${error}`);
      throw error;
    }
  }

  /**
   * Retrieves all the alerts attached to a case.
   */
  public async getAllAlertsAttachToCase({
    unsecuredSavedObjectsClient,
    caseId,
    filter,
  }: GetAllAlertsAttachToCaseArgs): Promise<Array<SavedObject<AttributesTypeAlerts>>> {
    try {
      this.log.debug(`Attempting to GET all alerts for case id ${caseId}`);
      const alertsFilter = buildFilter({
        filters: [CommentType.alert],
        field: 'type',
        operator: 'or',
        type: CASE_COMMENT_SAVED_OBJECT,
      });

      const combinedFilter = combineFilters([alertsFilter, filter]);

      const finder = unsecuredSavedObjectsClient.createPointInTimeFinder<AttributesTypeAlerts>({
        type: CASE_COMMENT_SAVED_OBJECT,
        hasReference: { type: CASE_SAVED_OBJECT, id: caseId },
        sortField: 'created_at',
        sortOrder: 'asc',
        filter: combinedFilter,
        perPage: MAX_DOCS_PER_PAGE,
      });

      let result: Array<SavedObject<AttributesTypeAlerts>> = [];
      for await (const userActionSavedObject of finder.find()) {
        result = result.concat(userActionSavedObject.saved_objects);
      }

      return result;
    } catch (error) {
      this.log.error(`Error on GET all alerts for case id ${caseId}: ${error}`);
      throw error;
    }
  }

  /**
   * Executes the aggregations against a type of attachment attached to a case.
   */
  public async executeCaseAggregations<Agg extends AggregationResponse = AggregationResponse>({
    unsecuredSavedObjectsClient,
    caseId,
    filter,
    aggregations,
    attachmentType,
  }: AttachmentsAttachedToCaseArgs): Promise<Agg | undefined> {
    try {
      this.log.debug(`Attempting to aggregate for case id ${caseId}`);
      const attachmentFilter = buildFilter({
        filters: attachmentType,
        field: 'type',
        operator: 'or',
        type: CASE_COMMENT_SAVED_OBJECT,
      });

      const combinedFilter = combineFilters([attachmentFilter, filter]);

      const response = await unsecuredSavedObjectsClient.find<AttachmentAttributes, Agg>({
        type: CASE_COMMENT_SAVED_OBJECT,
        hasReference: { type: CASE_SAVED_OBJECT, id: caseId },
        page: 1,
        perPage: 1,
        sortField: defaultSortField,
        aggs: aggregations,
        filter: combinedFilter,
      });

      return response.aggregations;
    } catch (error) {
      this.log.error(`Error while executing aggregation for case id ${caseId}: ${error}`);
      throw error;
    }
  }

  /**
   * Executes the aggregations against the actions attached to a case.
   */
  public async executeCaseActionsAggregations(
    params: CountActionsAttachedToCaseArgs
  ): Promise<AggregationResponse | undefined> {
    try {
      this.log.debug(`Attempting to count actions for case id ${params.caseId}`);
      return await this.executeCaseAggregations({ ...params, attachmentType: CommentType.actions });
    } catch (error) {
      this.log.error(`Error while counting actions for case id ${params.caseId}: ${error}`);
      throw error;
    }
  }

  public async get({
    unsecuredSavedObjectsClient,
    attachmentId,
  }: GetAttachmentArgs): Promise<SavedObject<AttachmentAttributes>> {
    try {
      this.log.debug(`Attempting to GET attachment ${attachmentId}`);
      return await unsecuredSavedObjectsClient.get<AttachmentAttributes>(
        CASE_COMMENT_SAVED_OBJECT,
        attachmentId
      );
    } catch (error) {
      this.log.error(`Error on GET attachment ${attachmentId}: ${error}`);
      throw error;
    }
  }

  public async delete({ unsecuredSavedObjectsClient, attachmentId }: GetAttachmentArgs) {
    try {
      this.log.debug(`Attempting to DELETE attachment ${attachmentId}`);
      return await unsecuredSavedObjectsClient.delete(CASE_COMMENT_SAVED_OBJECT, attachmentId);
    } catch (error) {
      this.log.error(`Error on DELETE attachment ${attachmentId}: ${error}`);
      throw error;
    }
  }

  public async create({
    unsecuredSavedObjectsClient,
    attributes,
    references,
    id,
  }: CreateAttachmentArgs) {
    try {
      this.log.debug(`Attempting to POST a new comment`);
      return await unsecuredSavedObjectsClient.create<AttachmentAttributes>(
        CASE_COMMENT_SAVED_OBJECT,
        attributes,
        {
          references,
          id,
        }
      );
    } catch (error) {
      this.log.error(`Error on POST a new comment: ${error}`);
      throw error;
    }
  }

  public async bulkCreate({ unsecuredSavedObjectsClient, attachments }: BulkCreateAttachments) {
    try {
      this.log.debug(`Attempting to bulk create attachments`);
      return await unsecuredSavedObjectsClient.bulkCreate(
        attachments.map((attachment) => ({ type: CASE_COMMENT_SAVED_OBJECT, ...attachment }))
      );
    } catch (error) {
      this.log.error(`Error on bulk create attachments: ${error}`);
      throw error;
    }
  }

  public async update({
    unsecuredSavedObjectsClient,
    attachmentId,
    updatedAttributes,
    options,
  }: UpdateAttachmentArgs) {
    try {
      this.log.debug(`Attempting to UPDATE comment ${attachmentId}`);
      return await unsecuredSavedObjectsClient.update<AttachmentAttributes>(
        CASE_COMMENT_SAVED_OBJECT,
        attachmentId,
        updatedAttributes,
        options
      );
    } catch (error) {
      this.log.error(`Error on UPDATE comment ${attachmentId}: ${error}`);
      throw error;
    }
  }

  public async bulkUpdate({ unsecuredSavedObjectsClient, comments }: BulkUpdateAttachmentArgs) {
    try {
      this.log.debug(
        `Attempting to UPDATE comments ${comments.map((c) => c.attachmentId).join(', ')}`
      );
      return await unsecuredSavedObjectsClient.bulkUpdate<AttachmentAttributes>(
        comments.map((c) => ({
          type: CASE_COMMENT_SAVED_OBJECT,
          id: c.attachmentId,
          attributes: c.updatedAttributes,
          ...c.options,
        }))
      );
    } catch (error) {
      this.log.error(
        `Error on UPDATE comments ${comments.map((c) => c.attachmentId).join(', ')}: ${error}`
      );
      throw error;
    }
  }

  public async getCaseCommentStats({
    unsecuredSavedObjectsClient,
    caseIds,
  }: {
    unsecuredSavedObjectsClient: SavedObjectsClientContract;
    caseIds: string[];
  }): Promise<Map<string, CommentStats>> {
    if (caseIds.length <= 0) {
      return new Map();
    }

    interface AggsResult {
      references: {
        caseIds: {
          buckets: Array<{
            key: string;
            doc_count: number;
            reverse: {
              alerts: {
                value: number;
              };
              comments: {
                doc_count: number;
              };
            };
          }>;
        };
      };
    }

    const res = await unsecuredSavedObjectsClient.find<unknown, AggsResult>({
      hasReference: caseIds.map((id) => ({ type: CASE_SAVED_OBJECT, id })),
      hasReferenceOperator: 'OR',
      type: CASE_COMMENT_SAVED_OBJECT,
      perPage: 0,
      aggs: AttachmentService.buildCommentStatsAggs(caseIds),
    });

    return (
      res.aggregations?.references.caseIds.buckets.reduce((acc, idBucket) => {
        acc.set(idBucket.key, {
          nonAlerts: idBucket.reverse.comments.doc_count,
          alerts: idBucket.reverse.alerts.value,
        });
        return acc;
      }, new Map<string, CommentStats>()) ?? new Map()
    );
  }

  private static buildCommentStatsAggs(
    ids: string[]
  ): Record<string, estypes.AggregationsAggregationContainer> {
    return {
      references: {
        nested: {
          path: `${CASE_COMMENT_SAVED_OBJECT}.references`,
        },
        aggregations: {
          caseIds: {
            terms: {
              field: `${CASE_COMMENT_SAVED_OBJECT}.references.id`,
              size: ids.length,
            },
            aggregations: {
              reverse: {
                reverse_nested: {},
                aggregations: {
                  alerts: {
                    cardinality: {
                      field: `${CASE_COMMENT_SAVED_OBJECT}.attributes.alertId`,
                    },
                  },
                  comments: {
                    filter: {
                      term: {
                        [`${CASE_COMMENT_SAVED_OBJECT}.attributes.type`]: CommentType.user,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
  }
}
