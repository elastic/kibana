/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
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
import { buildAlertStatusFilter } from '../../../detections/components/alerts_table/default_config';
import { getQueryFilter } from '../../../../common/detection_engine/get_query_filter';
import { Index } from '../../../../common/detection_engine/schemas/common/schemas';
import { formatExceptionItemForUpdate, prepareExceptionItemsForBulkClose } from './helpers';

/**
 * Adds exception items to the list. Also optionally closes alerts.
 *
 * @param exceptionItemsToAddOrUpdate array of ExceptionListItemSchema to add or update
 * @param alertIdToClose - optional string representing alert to close
 * @param bulkCloseIndex - optional index used to create bulk close query
 *
 */
export type AddOrUpdateExceptionItemsFunc = (
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
  onSuccess: () => void;
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
    async (exceptionItemsToAddOrUpdate, alertIdToClose, bulkCloseIndex) => {
      if (addOrUpdateExceptionRef.current !== null) {
        addOrUpdateExceptionRef.current(
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
      exceptionItemsToAddOrUpdate,
      alertIdToClose,
      bulkCloseIndex
    ) => {
      try {
        setIsLoading(true);
        if (alertIdToClose !== null && alertIdToClose !== undefined) {
          await updateAlertStatus({
            query: getUpdateAlertsQuery([alertIdToClose]),
            status: 'closed',
            signal: abortCtrl.signal,
          });
        }

        if (bulkCloseIndex != null) {
          const filter = getQueryFilter(
            '',
            'kuery',
            buildAlertStatusFilter('open'),
            bulkCloseIndex,
            prepareExceptionItemsForBulkClose(exceptionItemsToAddOrUpdate),
            false
          );
          await updateAlertStatus({
            query: {
              query: filter,
            },
            status: 'closed',
            signal: abortCtrl.signal,
          });
        }

        await addOrUpdateItems(exceptionItemsToAddOrUpdate);

        if (isSubscribed) {
          setIsLoading(false);
          onSuccess();
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
