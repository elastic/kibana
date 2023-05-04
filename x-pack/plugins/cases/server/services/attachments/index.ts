/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsBulkResponse,
  SavedObjectsBulkUpdateResponse,
  SavedObjectsFindResponse,
  SavedObjectsUpdateResponse,
} from '@kbn/core/server';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { CommentType } from '../../../common/api';
import { CASE_COMMENT_SAVED_OBJECT, CASE_SAVED_OBJECT } from '../../../common/constants';
import { buildFilter, combineFilters } from '../../client/utils';
import { defaultSortField } from '../../common/utils';
import type { AggregationResponse } from '../../client/metrics/types';
import {
  extractAttachmentSORefsFromAttributes,
  injectAttachmentSOAttributesFromRefs,
  injectAttachmentSOAttributesFromRefsForPatch,
} from '../so_references';
import type { SavedObjectFindOptionsKueryNode } from '../../common/types';
import type {
  AlertsAttachedToCaseArgs,
  AttachmentsAttachedToCaseArgs,
  BulkCreateAttachments,
  BulkUpdateAttachmentArgs,
  CountActionsAttachedToCaseArgs,
  CreateAttachmentArgs,
  DeleteAttachmentArgs,
  ServiceContext,
  UpdateAttachmentArgs,
} from './types';
import { AttachmentGetter } from './operations/get';
import type {
  AttachmentPersistedAttributes,
  AttachmentTransformedAttributes,
  AttachmentSavedObjectTransformed,
} from '../../common/types/attachments';

export class AttachmentService {
  private readonly _getter: AttachmentGetter;

  constructor(private readonly context: ServiceContext) {
    this._getter = new AttachmentGetter(context);
  }

  public get getter() {
    return this._getter;
  }

  public async countAlertsAttachedToCase(
    params: AlertsAttachedToCaseArgs
  ): Promise<number | undefined> {
    try {
      this.context.log.debug(`Attempting to count alerts for case id ${params.caseId}`);
      const res = await this.executeCaseAggregations<{ alerts: { value: number } }>({
        ...params,
        attachmentType: CommentType.alert,
        aggregations: this.buildAlertsAggs(),
      });

      return res?.alerts?.value;
    } catch (error) {
      this.context.log.error(`Error while counting alerts for case id ${params.caseId}: ${error}`);
      throw error;
    }
  }

  private buildAlertsAggs(): Record<string, estypes.AggregationsAggregationContainer> {
    return {
      alerts: {
        cardinality: {
          field: `${CASE_COMMENT_SAVED_OBJECT}.attributes.alertId`,
        },
      },
    };
  }

  /**
   * Executes the aggregations against a type of attachment attached to a case.
   */
  public async executeCaseAggregations<Agg extends AggregationResponse = AggregationResponse>({
    caseId,
    filter,
    aggregations,
    attachmentType,
  }: AttachmentsAttachedToCaseArgs): Promise<Agg | undefined> {
    try {
      this.context.log.debug(`Attempting to aggregate for case id ${caseId}`);
      const attachmentFilter = buildFilter({
        filters: attachmentType,
        field: 'type',
        operator: 'or',
        type: CASE_COMMENT_SAVED_OBJECT,
      });

      const combinedFilter = combineFilters([attachmentFilter, filter]);

      const response = await this.context.unsecuredSavedObjectsClient.find<unknown, Agg>({
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
      this.context.log.error(`Error while executing aggregation for case id ${caseId}: ${error}`);
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
      this.context.log.debug(`Attempting to count actions for case id ${params.caseId}`);
      return await this.executeCaseAggregations({ ...params, attachmentType: CommentType.actions });
    } catch (error) {
      this.context.log.error(`Error while counting actions for case id ${params.caseId}: ${error}`);
      throw error;
    }
  }

  public async bulkDelete({ attachmentIds, refresh }: DeleteAttachmentArgs) {
    try {
      if (attachmentIds.length <= 0) {
        return;
      }

      this.context.log.debug(`Attempting to DELETE attachments ${attachmentIds}`);
      return await this.context.unsecuredSavedObjectsClient.bulkDelete(
        attachmentIds.map((id) => ({ id, type: CASE_COMMENT_SAVED_OBJECT })),
        {
          refresh,
        }
      );
    } catch (error) {
      this.context.log.error(`Error on DELETE attachments ${attachmentIds}: ${error}`);
      throw error;
    }
  }

  public async create({
    attributes,
    references,
    id,
    refresh,
  }: CreateAttachmentArgs): Promise<AttachmentSavedObjectTransformed> {
    try {
      this.context.log.debug(`Attempting to POST a new comment`);

      const { attributes: extractedAttributes, references: extractedReferences } =
        extractAttachmentSORefsFromAttributes(
          attributes,
          references,
          this.context.persistableStateAttachmentTypeRegistry
        );

      const attachment =
        await this.context.unsecuredSavedObjectsClient.create<AttachmentPersistedAttributes>(
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
        this.context.persistableStateAttachmentTypeRegistry
      );
    } catch (error) {
      this.context.log.error(`Error on POST a new comment: ${error}`);
      throw error;
    }
  }

  public async bulkCreate({
    attachments,
    refresh,
  }: BulkCreateAttachments): Promise<SavedObjectsBulkResponse<AttachmentTransformedAttributes>> {
    try {
      this.context.log.debug(`Attempting to bulk create attachments`);
      const res =
        await this.context.unsecuredSavedObjectsClient.bulkCreate<AttachmentPersistedAttributes>(
          attachments.map((attachment) => {
            const { attributes: extractedAttributes, references: extractedReferences } =
              extractAttachmentSORefsFromAttributes(
                attachment.attributes,
                attachment.references,
                this.context.persistableStateAttachmentTypeRegistry
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
            this.context.persistableStateAttachmentTypeRegistry
          );
        }),
      };
    } catch (error) {
      this.context.log.error(`Error on bulk create attachments: ${error}`);
      throw error;
    }
  }

  public async update({
    attachmentId,
    updatedAttributes,
    options,
  }: UpdateAttachmentArgs): Promise<SavedObjectsUpdateResponse<AttachmentTransformedAttributes>> {
    try {
      this.context.log.debug(`Attempting to UPDATE comment ${attachmentId}`);

      const {
        attributes: extractedAttributes,
        references: extractedReferences,
        didDeleteOperation,
      } = extractAttachmentSORefsFromAttributes(
        updatedAttributes,
        options?.references ?? [],
        this.context.persistableStateAttachmentTypeRegistry
      );

      const shouldUpdateRefs = extractedReferences.length > 0 || didDeleteOperation;

      const res =
        await this.context.unsecuredSavedObjectsClient.update<AttachmentPersistedAttributes>(
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
        this.context.persistableStateAttachmentTypeRegistry
      );
    } catch (error) {
      this.context.log.error(`Error on UPDATE comment ${attachmentId}: ${error}`);
      throw error;
    }
  }

  public async bulkUpdate({
    comments,
    refresh,
  }: BulkUpdateAttachmentArgs): Promise<
    SavedObjectsBulkUpdateResponse<AttachmentTransformedAttributes>
  > {
    try {
      this.context.log.debug(
        `Attempting to UPDATE comments ${comments.map((c) => c.attachmentId).join(', ')}`
      );

      const res =
        await this.context.unsecuredSavedObjectsClient.bulkUpdate<AttachmentPersistedAttributes>(
          comments.map((c) => {
            const {
              attributes: extractedAttributes,
              references: extractedReferences,
              didDeleteOperation,
            } = extractAttachmentSORefsFromAttributes(
              c.updatedAttributes,
              c.options?.references ?? [],
              this.context.persistableStateAttachmentTypeRegistry
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
            this.context.persistableStateAttachmentTypeRegistry
          );
        }),
      };
    } catch (error) {
      this.context.log.error(
        `Error on UPDATE comments ${comments.map((c) => c.attachmentId).join(', ')}: ${error}`
      );
      throw error;
    }
  }

  public async find({
    options,
  }: {
    options?: SavedObjectFindOptionsKueryNode;
  }): Promise<SavedObjectsFindResponse<AttachmentTransformedAttributes>> {
    try {
      this.context.log.debug(`Attempting to find comments`);
      const res =
        await this.context.unsecuredSavedObjectsClient.find<AttachmentPersistedAttributes>({
          sortField: defaultSortField,
          ...options,
          type: CASE_COMMENT_SAVED_OBJECT,
        });

      return {
        ...res,
        saved_objects: res.saved_objects.map((so) => {
          const injectedSO = injectAttachmentSOAttributesFromRefs(
            so,
            this.context.persistableStateAttachmentTypeRegistry
          );

          return {
            ...so,
            ...injectedSO,
          };
        }),
      };
    } catch (error) {
      this.context.log.error(`Error on find comments: ${error}`);
      throw error;
    }
  }
}
