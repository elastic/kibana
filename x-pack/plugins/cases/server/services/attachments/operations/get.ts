/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { FILE_SO_TYPE } from '@kbn/files-plugin/common';
import type {
  AttachmentPersistedAttributes,
  AttachmentTransformedAttributes,
  AttachmentSavedObjectTransformed,
} from '../../../common/types/attachments';
import {
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  MAX_ALERTS_PER_CASE,
  MAX_DOCS_PER_PAGE,
} from '../../../../common/constants';
import { buildFilter, combineFilters } from '../../../client/utils';
import type { AttachmentTotals, AttributesTypeAlerts } from '../../../../common/api';
import { CommentType } from '../../../../common/api';
import type {
  AlertIdsAggsResult,
  BulkOptionalAttributes,
  GetAllAlertsAttachToCaseArgs,
  GetAttachmentArgs,
  ServiceContext,
} from '../types';
import {
  injectAttachmentAttributesAndHandleErrors,
  injectAttachmentSOAttributesFromRefs,
} from '../../so_references';
import { partitionByCaseAssociation } from '../../../common/partitioning';
import type { AttachmentSavedObject } from '../../../common/types';
import { getCaseReferenceId } from '../../../common/references';

export class AttachmentGetter {
  constructor(private readonly context: ServiceContext) {}

  public async bulkGet(
    attachmentIds: string[]
  ): Promise<BulkOptionalAttributes<AttachmentTransformedAttributes>> {
    try {
      this.context.log.debug(
        `Attempting to retrieve attachments with ids: ${attachmentIds.join()}`
      );

      const response =
        await this.context.unsecuredSavedObjectsClient.bulkGet<AttachmentPersistedAttributes>(
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

      // We are intentionally not adding the type here because we only want to interact with the id and this function
      // should not use the attributes
      const finder = this.context.unsecuredSavedObjectsClient.createPointInTimeFinder<unknown>({
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
        this.context.unsecuredSavedObjectsClient.createPointInTimeFinder<AttachmentPersistedAttributes>(
          {
            type: CASE_COMMENT_SAVED_OBJECT,
            hasReference: { type: CASE_SAVED_OBJECT, id: caseId },
            sortField: 'created_at',
            sortOrder: 'asc',
            filter: combinedFilter,
            perPage: MAX_DOCS_PER_PAGE,
          }
        );

      let result: Array<SavedObject<AttributesTypeAlerts>> = [];
      for await (const userActionSavedObject of finder.find()) {
        result = result.concat(
          // We need a cast here because to limited attachment type conflicts with the expected result even though they
          // should be the same
          userActionSavedObject.saved_objects as unknown as Array<SavedObject<AttributesTypeAlerts>>
        );
      }

      return result;
    } catch (error) {
      this.context.log.error(`Error on GET all alerts for case id ${caseId}: ${error}`);
      throw error;
    }
  }

  /**
   * Retrieves all the alerts attached to a case.
   */
  public async getAllAlertIds({ caseId }: { caseId: string }): Promise<Set<string>> {
    try {
      this.context.log.debug(`Attempting to GET all alerts ids for case id ${caseId}`);
      const alertsFilter = buildFilter({
        filters: [CommentType.alert],
        field: 'type',
        operator: 'or',
        type: CASE_COMMENT_SAVED_OBJECT,
      });

      const res = await this.context.unsecuredSavedObjectsClient.find<unknown, AlertIdsAggsResult>({
        type: CASE_COMMENT_SAVED_OBJECT,
        hasReference: { type: CASE_SAVED_OBJECT, id: caseId },
        sortField: 'created_at',
        sortOrder: 'asc',
        filter: alertsFilter,
        perPage: 0,
        aggs: {
          alertIds: {
            terms: {
              field: `${CASE_COMMENT_SAVED_OBJECT}.attributes.alertId`,
              size: MAX_ALERTS_PER_CASE,
            },
          },
        },
      });

      const alertIds = res.aggregations?.alertIds.buckets.map((bucket) => bucket.key) ?? [];
      return new Set(alertIds);
    } catch (error) {
      this.context.log.error(`Error on GET all alerts ids for case id ${caseId}: ${error}`);
      throw error;
    }
  }

  public async get({ attachmentId }: GetAttachmentArgs): Promise<AttachmentSavedObjectTransformed> {
    try {
      this.context.log.debug(`Attempting to GET attachment ${attachmentId}`);
      const res = await this.context.unsecuredSavedObjectsClient.get<AttachmentPersistedAttributes>(
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

  public async getFileAttachments({
    caseId,
    fileIds,
  }: {
    caseId: string;
    fileIds: string[];
  }): Promise<AttachmentSavedObjectTransformed[]> {
    try {
      this.context.log.debug('Attempting to find file attachments');

      /**
       * This is making a big assumption that a single file service saved object can only be associated within a single
       * case. If a single file can be attached to multiple cases it will complicate deleting a file.
       *
       * The file's metadata would have to contain all case ids and deleting a file would need to removing a case id from
       * array instead of deleting the entire saved object in the situation where the file is attached to multiple cases.
       */
      const references = fileIds.map((id) => ({ id, type: FILE_SO_TYPE }));

      /**
       * In the event that we add the ability to attach a file to a case that has already been uploaded we'll run into a
       * scenario where a single file id could be associated with multiple case attachments. So we need
       * to retrieve them all.
       */
      const finder =
        this.context.unsecuredSavedObjectsClient.createPointInTimeFinder<AttachmentPersistedAttributes>(
          {
            type: CASE_COMMENT_SAVED_OBJECT,
            hasReference: references,
            sortField: 'created_at',
            sortOrder: 'asc',
            perPage: MAX_DOCS_PER_PAGE,
          }
        );

      const foundAttachments: AttachmentSavedObjectTransformed[] = [];

      for await (const attachmentSavedObjects of finder.find()) {
        foundAttachments.push(
          ...attachmentSavedObjects.saved_objects.map((attachment) => {
            const modifiedAttachment = injectAttachmentSOAttributesFromRefs(
              attachment,
              this.context.persistableStateAttachmentTypeRegistry
            );

            return modifiedAttachment;
          })
        );
      }

      const [validFileAttachments, invalidFileAttachments] = partitionByCaseAssociation(
        caseId,
        foundAttachments
      );

      this.logInvalidFileAssociations(invalidFileAttachments, fileIds, caseId);

      return validFileAttachments;
    } catch (error) {
      this.context.log.error(`Error retrieving file attachments file ids: ${fileIds}: ${error}`);
      throw error;
    }
  }

  private logInvalidFileAssociations(
    attachments: AttachmentSavedObject[],
    fileIds: string[],
    targetCaseId: string
  ) {
    const caseIds: string[] = [];
    for (const attachment of attachments) {
      const caseRefId = getCaseReferenceId(attachment.references);
      if (caseRefId != null) {
        caseIds.push(caseRefId);
      }
    }

    if (caseIds.length > 0) {
      this.context.log.warn(
        `Found files associated to cases outside of request: ${caseIds} file ids: ${fileIds} target case id: ${targetCaseId}`
      );
    }
  }
}
