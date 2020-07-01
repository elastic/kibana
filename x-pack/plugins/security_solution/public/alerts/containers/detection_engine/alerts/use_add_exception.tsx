/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useRef, useState } from 'react';
import { HttpStart } from '../../../../../../../../src/core/public';

import { ExceptionListItemSchema } from '../../../../../../lists/common/schemas';
import { addExceptionListItem, updateExceptionListItem } from '../../../../lists_plugin_deps';
import { updateAlertStatus } from './api';
// TODO: move getUpdatedAlertsQuery to api.ts
import { getUpdateAlertsQuery } from '../../../components/alerts_table/actions';

/**
 * Adds exception items to the list. Also optionally closes alerts.
 *
 * @param exceptionItemsToAddOrUpdate array of ExceptionListItemSchema to add or update
 * @param alertIdToClose - optional string representing alert to close
 *
 */
export type AddOrUpdateExceptionItemsFunc = (
  exceptionItemsToAddOrUpdate: ExceptionListItemSchema[],
  alertIdToClose?: string
) => Promise<void>;

export type ReturnUseAddOrUpdateException = [
  { isLoading: boolean },
  AddOrUpdateExceptionItemsFunc | null
];

export interface UseAddOrUpdateExceptionProps {
  http: HttpStart;
  onError: (arg: Error) => void;
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
  const addOrUpdateException = useRef<AddOrUpdateExceptionItemsFunc | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const addOrUpdateItems = async (
      exceptionItemsToAddOrUpdate: ExceptionListItemSchema[]
    ): Promise<void> => {
      const toAdd: ExceptionListItemSchema[] = [];
      const toUpdate: ExceptionListItemSchema[] = [];
      exceptionItemsToAddOrUpdate.forEach((item: ExceptionListItemSchema) => {
        if (item.id) {
          toUpdate.push(item);
        } else {
          // TODO: builder should set item.id to undefined
          delete item.id;
          toAdd.push(item);
        }
      });

      console.log('exceptionItemsToAdd', toAdd);
      console.log('exceptionItemToEdit', toUpdate);
      const promises: Array<Promise<ExceptionListItemSchema>> = [];
      // TODO: use bulk api
      toAdd.forEach((item: ExceptionListItemSchema) => {
        promises.push(
          addExceptionListItem({
            http,
            listItem: item,
            signal: abortCtrl.signal,
          })
        );
      });
      // TODO: use bulk api
      toUpdate.forEach((item: ExceptionListItemSchema) => {
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
      alertIdToClose
    ) => {
      try {
        setIsLoading(true);
        if (alertIdToClose !== null && alertIdToClose !== undefined) {
          await updateAlertStatus({
            query: getUpdateAlertsQuery([alertIdToClose]),
            status: 'closed',
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
          onError(error);
        }
      }
    };

    addOrUpdateException.current = addOrUpdateExceptionItems;
    return (): void => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [http, onSuccess, onError]);

  return [{ isLoading }, addOrUpdateException.current];
};
