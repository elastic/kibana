/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { UpdateDocumentByQueryResponse } from 'elasticsearch';
import { HttpStart } from '../../../../../../../src/core/public';

import {
  addExceptionListItem,
  updateExceptionListItem,
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
  UpdateExceptionListItemSchema,
} from '../../../lists_plugin_deps';
import { updateAlertStatus } from '../../../detections/containers/detection_engine/alerts/api';
import { getUpdateAlertsQuery } from '../../../detections/components/alerts_table/actions';
import {
  buildAlertStatusFilter,
  buildAlertsRuleIdFilter,
} from '../../../detections/components/alerts_table/default_config';
import { getQueryFilter } from '../../../../common/detection_engine/get_query_filter';
import { Index } from '../../../../common/detection_engine/schemas/common/schemas';
import { formatExceptionItemForUpdate, prepareExceptionItemsForBulkClose } from './helpers';

/**
 * Adds exception items to the list. Also optionally closes alerts.
 *
 * @param ruleId id of the rule where the exception updates will be applied
 * @param exceptionItemsToAddOrUpdate array of ExceptionListItemSchema to add or update
 * @param alertIdToClose - optional string representing alert to close
 * @param bulkCloseIndex - optional index used to create bulk close query
 *
 */
export type AddOrUpdateExceptionItemsFunc = (
  ruleId: string,
  exceptionItemsToAddOrUpdate: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>,
  alertIdToClose?: string,
  bulkCloseIndex?: Index
) => Promise<void>;

export type ReturnUseAddOrUpdateException = [
  { isLoading: boolean },
  AddOrUpdateExceptionItemsFunc | null
];

export interface UseAddOrUpdateExceptionProps {
  http: HttpStart;
  onError: (arg: Error, code: number | null, message: string | null) => void;
  onSuccess: (updated: number, conficts: number) => void;
}

/**
 * Hook for adding and updating an exception item
 *
 * @param http Kibana http service
 * @param onError error callback
 * @param onSuccess callback when all lists fetched successfully
 *
 */
export const useAddOrUpdateException = ({
  http,
  onError,
  onSuccess,
}: UseAddOrUpdateExceptionProps): ReturnUseAddOrUpdateException => {
  const [isLoading, setIsLoading] = useState(false);
  const addOrUpdateExceptionRef = useRef<AddOrUpdateExceptionItemsFunc | null>(null);
  const addOrUpdateException = useCallback<AddOrUpdateExceptionItemsFunc>(
    async (ruleId, exceptionItemsToAddOrUpdate, alertIdToClose, bulkCloseIndex) => {
      if (addOrUpdateExceptionRef.current !== null) {
        addOrUpdateExceptionRef.current(
          ruleId,
          exceptionItemsToAddOrUpdate,
          alertIdToClose,
          bulkCloseIndex
        );
      }
    },
    []
  );

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const addOrUpdateItems = async (
      exceptionItemsToAddOrUpdate: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>
    ): Promise<void> => {
      const toAdd: CreateExceptionListItemSchema[] = [];
      const toUpdate: UpdateExceptionListItemSchema[] = [];
      exceptionItemsToAddOrUpdate.forEach(
        (item: ExceptionListItemSchema | CreateExceptionListItemSchema) => {
          if ('id' in item && item.id !== undefined) {
            toUpdate.push(formatExceptionItemForUpdate(item));
          } else {
            toAdd.push(item);
          }
        }
      );

      const promises: Array<Promise<ExceptionListItemSchema>> = [];
      toAdd.forEach((item: CreateExceptionListItemSchema) => {
        promises.push(
          addExceptionListItem({
            http,
            listItem: item,
            signal: abortCtrl.signal,
          })
        );
      });
      toUpdate.forEach((item: UpdateExceptionListItemSchema) => {
        promises.push(
          updateExceptionListItem({
            http,
            listItem: item,
            signal: abortCtrl.signal,
          })
        );
      });
      await Promise.all(promises);
    };

    const addOrUpdateExceptionItems: AddOrUpdateExceptionItemsFunc = async (
      ruleId,
      exceptionItemsToAddOrUpdate,
      alertIdToClose,
      bulkCloseIndex
    ) => {
      try {
        setIsLoading(true);
        let alertIdResponse: UpdateDocumentByQueryResponse | undefined;
        let bulkResponse: UpdateDocumentByQueryResponse | undefined;
        if (alertIdToClose != null) {
          alertIdResponse = await updateAlertStatus({
            query: getUpdateAlertsQuery([alertIdToClose]),
            status: 'closed',
            signal: abortCtrl.signal,
          });
        }

        if (bulkCloseIndex != null) {
          const filter = getQueryFilter(
            '',
            'kuery',
            [...buildAlertsRuleIdFilter(ruleId), ...buildAlertStatusFilter('open')],
            bulkCloseIndex,
            prepareExceptionItemsForBulkClose(exceptionItemsToAddOrUpdate),
            false
          );

          bulkResponse = await updateAlertStatus({
            query: {
              query: filter,
            },
            status: 'closed',
            signal: abortCtrl.signal,
          });
        }

        await addOrUpdateItems(exceptionItemsToAddOrUpdate);

        // NOTE: there could be some overlap here... it's possible that the first response had conflicts
        // but that the alert was closed in the second call. In this case, a conflict will be reported even
        // though it was already resolved. I'm not sure that there's an easy way to solve this, but it should
        // have minimal impact on the user... they'd see a warning that indicates a possible conflict, but the
        // state of the alerts and their representation in the UI would be consistent.
        const updated = (alertIdResponse?.updated ?? 0) + (bulkResponse?.updated ?? 0);
        const conflicts =
          alertIdResponse?.version_conflicts ?? 0 + (bulkResponse?.version_conflicts ?? 0);

        if (isSubscribed) {
          setIsLoading(false);
          onSuccess(updated, conflicts);
        }
      } catch (error) {
        if (isSubscribed) {
          setIsLoading(false);
          if (error.body != null) {
            onError(error, error.body.status_code, error.body.message);
          } else {
            onError(error, null, null);
          }
        }
      }
    };

    addOrUpdateExceptionRef.current = addOrUpdateExceptionItems;
    return (): void => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [http, onSuccess, onError]);

  return [{ isLoading }, addOrUpdateException];
};
