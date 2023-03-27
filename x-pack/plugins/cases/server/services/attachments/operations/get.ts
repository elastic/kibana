/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  MAX_DOCS_PER_PAGE,
} from '../../../../common/constants';
import { buildFilter, combineFilters } from '../../../client/utils';
import type {
  AttachmentTotals,
  AttributesTypeAlerts,
  CommentAttributes as AttachmentAttributes,
  CommentAttributesWithoutRefs as AttachmentAttributesWithoutRefs,
  CommentAttributes,
} from '../../../../common/api';
import { CommentType } from '../../../../common/api';
import type {
  AttachedToCaseArgs,
  BulkOptionalAttributes,
  GetAttachmentArgs,
  ServiceContext,
} from '../types';
import {
  injectAttachmentAttributesAndHandleErrors,
  injectAttachmentSOAttributesFromRefs,
} from '../../so_references';

type GetAllAlertsAttachToCaseArgs = AttachedToCaseArgs;

export class AttachmentGetter {
  constructor(private readonly context: ServiceContext) {}

  public async bulkGet(
    attachmentIds: string[]
  ): Promise<BulkOptionalAttributes<CommentAttributes>> {
    try {
      this.context.log.debug(
        `Attempting to retrieve attachments with ids: ${attachmentIds.join()}`
      );

      const response =
        await this.context.unsecuredSavedObjectsClient.bulkGet<AttachmentAttributesWithoutRefs>(
          attachmentIds.map((id) => ({ id, type: CASE_COMMENT_SAVED_OBJECT }))
        );

      return {
        saved_objects: response.saved_objects.map((so) =>
          injectAttachmentAttributesAndHandleErrors(
            so,
            this.context.persistableStateAttachmentTypeRegistry
          )
        ),
      };
    } catch (error) {
      this.context.log.error(
        `Error retrieving attachments with ids ${attachmentIds.join()}: ${error}`
      );
      throw error;
    }
  }

  public async getAttachmentIdsForCases({ caseIds }: { caseIds: string[] }) {
    try {
      this.context.log.debug(
        `Attempting to retrieve attachments associated with cases: [${caseIds}]`
      );

      const finder = this.context.unsecuredSavedObjectsClient.createPointInTimeFinder({
        type: CASE_COMMENT_SAVED_OBJECT,
        hasReference: caseIds.map((id) => ({ id, type: CASE_SAVED_OBJECT })),
        sortField: 'created_at',
        sortOrder: 'asc',
        /**
         * We only care about the ids so to reduce the data returned we should limit the fields in the response. Core
         * doesn't support retrieving no fields (id would always be returned anyway) so to limit it we'll only request
         * the owner even though we don't need it.
         */
        fields: ['owner'],
        perPage: MAX_DOCS_PER_PAGE,
      });

      const ids: string[] = [];

      for await (const attachmentSavedObject of finder.find()) {
        ids.push(...attachmentSavedObject.saved_objects.map((attachment) => attachment.id));
      }

      return ids;
    } catch (error) {
      this.context.log.error(
        `Error retrieving attachments associated with cases: [${caseIds}]: ${error}`
      );
      throw error;
    }
  }

  /**
   * Retrieves all the alerts attached to a case.
   */
  public async getAllAlertsAttachToCase({
    caseId,
    filter,
  }: GetAllAlertsAttachToCaseArgs): Promise<Array<SavedObject<AttributesTypeAlerts>>> {
    try {
      this.context.log.debug(`Attempting to GET all alerts for case id ${caseId}`);
      const alertsFilter = buildFilter({
        filters: [CommentType.alert],
        field: 'type',
        operator: 'or',
        type: CASE_COMMENT_SAVED_OBJECT,
      });

      const combinedFilter = combineFilters([alertsFilter, filter]);

      const finder =
        this.context.unsecuredSavedObjectsClient.createPointInTimeFinder<AttributesTypeAlerts>({
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
      this.context.log.error(`Error on GET all alerts for case id ${caseId}: ${error}`);
      throw error;
    }
  }

  public async get({
    attachmentId,
  }: GetAttachmentArgs): Promise<SavedObject<AttachmentAttributes>> {
    try {
      this.context.log.debug(`Attempting to GET attachment ${attachmentId}`);
      const res =
        await this.context.unsecuredSavedObjectsClient.get<AttachmentAttributesWithoutRefs>(
          CASE_COMMENT_SAVED_OBJECT,
          attachmentId
        );

      return injectAttachmentSOAttributesFromRefs(
        res,
        this.context.persistableStateAttachmentTypeRegistry
      );
    } catch (error) {
      this.context.log.error(`Error on GET attachment ${attachmentId}: ${error}`);
      throw error;
    }
  }

  public async getCaseCommentStats({
    caseIds,
  }: {
    caseIds: string[];
  }): Promise<Map<string, AttachmentTotals>> {
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

    const res = await this.context.unsecuredSavedObjectsClient.find<unknown, AggsResult>({
      hasReference: caseIds.map((id) => ({ type: CASE_SAVED_OBJECT, id })),
      hasReferenceOperator: 'OR',
      type: CASE_COMMENT_SAVED_OBJECT,
      perPage: 0,
      aggs: AttachmentGetter.buildCommentStatsAggs(caseIds),
    });

    return (
      res.aggregations?.references.caseIds.buckets.reduce((acc, idBucket) => {
        acc.set(idBucket.key, {
          userComments: idBucket.reverse.comments.doc_count,
          alerts: idBucket.reverse.alerts.value,
        });
        return acc;
      }, new Map<string, AttachmentTotals>()) ?? new Map()
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
