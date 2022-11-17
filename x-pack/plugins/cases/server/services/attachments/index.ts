/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Logger,
  SavedObject,
  SavedObjectReference,
  SavedObjectsBulkResponse,
  SavedObjectsBulkUpdateResponse,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
  SavedObjectsUpdateOptions,
  SavedObjectsUpdateResponse,
} from '@kbn/core/server';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { KueryNode } from '@kbn/es-query';
import type {
  AttachmentTotals,
  AttributesTypeAlerts,
  CommentAttributes as AttachmentAttributes,
  CommentAttributesWithoutRefs as AttachmentAttributesWithoutRefs,
  CommentPatchAttributes as AttachmentPatchAttributes,
} from '../../../common/api';
import { CommentType } from '../../../common/api';
import {
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  MAX_DOCS_PER_PAGE,
} from '../../../common/constants';
import type { ClientArgs } from '..';
import { buildFilter, combineFilters } from '../../client/utils';
import { defaultSortField } from '../../common/utils';
import type { AggregationResponse } from '../../client/metrics/types';
import {
  extractAttachmentSORefsFromAttributes,
  injectAttachmentSOAttributesFromRefs,
  injectAttachmentSOAttributesFromRefsForPatch,
} from '../so_references';
import type { SavedObjectFindOptionsKueryNode } from '../../common/types';
import type { PersistableStateAttachmentTypeRegistry } from '../../attachment_framework/persistable_state_registry';
import type { IndexRefresh } from '../types';

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

interface DeleteAttachmentArgs extends GetAttachmentArgs, IndexRefresh {}

interface CreateAttachmentArgs extends ClientArgs, IndexRefresh {
  attributes: AttachmentAttributes;
  references: SavedObjectReference[];
  id: string;
}

interface BulkCreateAttachments extends ClientArgs, IndexRefresh {
  attachments: Array<{
    attributes: AttachmentAttributes;
    references: SavedObjectReference[];
    id: string;
  }>;
}

interface UpdateArgs {
  attachmentId: string;
  updatedAttributes: AttachmentPatchAttributes;
  options?: Omit<SavedObjectsUpdateOptions<AttachmentAttributes>, 'upsert'>;
}

export type UpdateAttachmentArgs = UpdateArgs & ClientArgs;

interface BulkUpdateAttachmentArgs extends ClientArgs, IndexRefresh {
  comments: UpdateArgs[];
}

export class AttachmentService {
  constructor(
    private readonly log: Logger,
    private readonly persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry
  ) {}

  public async getAttachmentIdsForCases({
    caseIds,
    unsecuredSavedObjectsClient,
  }: {
    caseIds: string[];
    unsecuredSavedObjectsClient: SavedObjectsClientContract;
  }) {
    try {
      this.log.debug(`Attempting to retrieve attachments associated with cases: [${caseIds}]`);

      const finder = unsecuredSavedObjectsClient.createPointInTimeFinder({
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
      this.log.error(`Error retrieving attachments associated with cases: [${caseIds}]: ${error}`);
      throw error;
    }
  }

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
      const res = await unsecuredSavedObjectsClient.get<AttachmentAttributesWithoutRefs>(
        CASE_COMMENT_SAVED_OBJECT,
        attachmentId
      );

      return injectAttachmentSOAttributesFromRefs(res, this.persistableStateAttachmentTypeRegistry);
    } catch (error) {
      this.log.error(`Error on GET attachment ${attachmentId}: ${error}`);
      throw error;
    }
  }

  public async delete({
    unsecuredSavedObjectsClient,
    attachmentId,
    refresh,
  }: DeleteAttachmentArgs) {
    try {
      this.log.debug(`Attempting to DELETE attachment ${attachmentId}`);
      return await unsecuredSavedObjectsClient.delete(CASE_COMMENT_SAVED_OBJECT, attachmentId, {
        refresh,
      });
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
    refresh,
  }: CreateAttachmentArgs): Promise<SavedObject<AttachmentAttributes>> {
    try {
      this.log.debug(`Attempting to POST a new comment`);

      const { attributes: extractedAttributes, references: extractedReferences } =
        extractAttachmentSORefsFromAttributes(
          attributes,
          references,
          this.persistableStateAttachmentTypeRegistry
        );

      const attachment = await unsecuredSavedObjectsClient.create<AttachmentAttributesWithoutRefs>(
        CASE_COMMENT_SAVED_OBJECT,
        extractedAttributes,
        {
          references: extractedReferences,
          id,
          refresh,
        }
      );

      return injectAttachmentSOAttributesFromRefs(
        attachment,
        this.persistableStateAttachmentTypeRegistry
      );
    } catch (error) {
      this.log.error(`Error on POST a new comment: ${error}`);
      throw error;
    }
  }

  public async bulkCreate({
    unsecuredSavedObjectsClient,
    attachments,
    refresh,
  }: BulkCreateAttachments): Promise<SavedObjectsBulkResponse<AttachmentAttributes>> {
    try {
      this.log.debug(`Attempting to bulk create attachments`);
      const res = await unsecuredSavedObjectsClient.bulkCreate<AttachmentAttributesWithoutRefs>(
        attachments.map((attachment) => {
          const { attributes: extractedAttributes, references: extractedReferences } =
            extractAttachmentSORefsFromAttributes(
              attachment.attributes,
              attachment.references,
              this.persistableStateAttachmentTypeRegistry
            );

          return {
            type: CASE_COMMENT_SAVED_OBJECT,
            ...attachment,
            attributes: extractedAttributes,
            references: extractedReferences,
          };
        }),
        { refresh }
      );

      return {
        saved_objects: res.saved_objects.map((so) => {
          return injectAttachmentSOAttributesFromRefs(
            so,
            this.persistableStateAttachmentTypeRegistry
          );
        }),
      };
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
  }: UpdateAttachmentArgs): Promise<SavedObjectsUpdateResponse<AttachmentAttributes>> {
    try {
      this.log.debug(`Attempting to UPDATE comment ${attachmentId}`);

      const {
        attributes: extractedAttributes,
        references: extractedReferences,
        didDeleteOperation,
      } = extractAttachmentSORefsFromAttributes(
        updatedAttributes,
        options?.references ?? [],
        this.persistableStateAttachmentTypeRegistry
      );

      const shouldUpdateRefs = extractedReferences.length > 0 || didDeleteOperation;

      const res = await unsecuredSavedObjectsClient.update<AttachmentAttributesWithoutRefs>(
        CASE_COMMENT_SAVED_OBJECT,
        attachmentId,
        extractedAttributes,
        {
          ...options,
          /**
           * If options?.references are undefined and there is no field to move to the refs
           * then the extractedReferences will be an empty array. If we pass the empty array
           * on the update then all previously refs will be removed. The check below is needed
           * to prevent this.
           */
          references: shouldUpdateRefs ? extractedReferences : undefined,
        }
      );

      return injectAttachmentSOAttributesFromRefsForPatch(
        updatedAttributes,
        res,
        this.persistableStateAttachmentTypeRegistry
      );
    } catch (error) {
      this.log.error(`Error on UPDATE comment ${attachmentId}: ${error}`);
      throw error;
    }
  }

  public async bulkUpdate({
    unsecuredSavedObjectsClient,
    comments,
    refresh,
  }: BulkUpdateAttachmentArgs): Promise<SavedObjectsBulkUpdateResponse<AttachmentAttributes>> {
    try {
      this.log.debug(
        `Attempting to UPDATE comments ${comments.map((c) => c.attachmentId).join(', ')}`
      );

      const res = await unsecuredSavedObjectsClient.bulkUpdate<AttachmentAttributesWithoutRefs>(
        comments.map((c) => {
          const {
            attributes: extractedAttributes,
            references: extractedReferences,
            didDeleteOperation,
          } = extractAttachmentSORefsFromAttributes(
            c.updatedAttributes,
            c.options?.references ?? [],
            this.persistableStateAttachmentTypeRegistry
          );

          const shouldUpdateRefs = extractedReferences.length > 0 || didDeleteOperation;

          return {
            ...c.options,
            type: CASE_COMMENT_SAVED_OBJECT,
            id: c.attachmentId,
            attributes: extractedAttributes,
            /* If c.options?.references are undefined and there is no field to move to the refs
             * then the extractedAttributes will be an empty array. If we pass the empty array
             * on the update then all previously refs will be removed. The check below is needed
             * to prevent this.
             */
            references: shouldUpdateRefs ? extractedReferences : undefined,
          };
        }),
        { refresh }
      );

      return {
        saved_objects: res.saved_objects.map((so, index) => {
          return injectAttachmentSOAttributesFromRefsForPatch(
            comments[index].updatedAttributes,
            so,
            this.persistableStateAttachmentTypeRegistry
          );
        }),
      };
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
          userComments: idBucket.reverse.comments.doc_count,
          alerts: idBucket.reverse.alerts.value,
        });
        return acc;
      }, new Map<string, AttachmentTotals>()) ?? new Map()
    );
  }

  public async find({
    unsecuredSavedObjectsClient,
    options,
  }: {
    unsecuredSavedObjectsClient: SavedObjectsClientContract;
    options?: SavedObjectFindOptionsKueryNode;
  }): Promise<SavedObjectsFindResponse<AttachmentAttributes>> {
    try {
      this.log.debug(`Attempting to find comments`);
      const res = await unsecuredSavedObjectsClient.find<AttachmentAttributesWithoutRefs>({
        sortField: defaultSortField,
        ...options,
        type: CASE_COMMENT_SAVED_OBJECT,
      });

      return {
        ...res,
        saved_objects: res.saved_objects.map((so) => {
          const injectedSO = injectAttachmentSOAttributesFromRefs(
            so,
            this.persistableStateAttachmentTypeRegistry
          );

          return {
            ...so,
            ...injectedSO,
          };
        }),
      };
    } catch (error) {
      this.log.error(`Error on find comments: ${error}`);
      throw error;
    }
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
