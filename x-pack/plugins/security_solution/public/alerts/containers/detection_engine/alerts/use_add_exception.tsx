/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { HttpStart } from '../../../../../../../../src/core/public';

import { ExceptionListItemSchema } from '../../../../../../lists/common/schemas';
import { addExceptionListItem, updateExceptionListItem } from '../../../../lists_plugin_deps';
import { updateAlertStatus } from './api';
// TODO: move getUpdatedAlertsQuery to api.ts
import { getUpdateAlertsQuery } from '../../../components/alerts_table/actions';

/**
 * Adds exception items to the list. Also optionally closes alerts.
 *
 * @param exceptionItemsToAdd array of ExceptionListItemSchema to add
 * @param alertIdToClose - optional string representing alert to close
 *
 */
type AddExceptionItemsFunc = (
  exceptionItemsToAdd: ExceptionListItemSchema[],
  alertIdToClose?: string
) => Promise<void>;

export type ReturnUseAddException = [{ isLoading: boolean }, AddExceptionItemsFunc];

// TODO: what does the callback take as arguments?
export interface UseAddExceptionSuccess {}

export interface UseAddExceptionProps {
  http: HttpStart;
  exceptionItems: ExceptionListItemSchema[];
  onError: (arg: Error) => void;
  onSuccess: (arg: UseAddExceptionSuccess) => void;
}

/**
 * Hook for adding an exception item
 *
 * @param http Kibana http service
 * @param onError error callback
 * @param onSuccess callback when all lists fetched successfully
 *
 */
export const useAddException = ({
  http,
  onError,
  onSuccess,
}: UseAddExceptionProps): ReturnUseAddException => {
  const [isLoading, setIsLoading] = useState(false);
  const addException = useRef<AddExceptionItemsFunc | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const addExceptionItems: AddExceptionItemsFunc = async (
      exceptionItemsToAdd,
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

        const itemsMap: {
          toAdd: ExceptionListItemSchema[];
          toUpdate: ExceptionListItemSchema[];
        } = exceptionItemsToAdd.reduce(
          function (memo, item: ExceptionListItemSchema) {
            if (item.id) {
              memo.toUpdate.push(item);
            } else {
              // TODO: builder should set item.id to undefined
              delete item.id;
              memo.toAdd.push(item);
            }
            return memo;
          },
          {
            toAdd: [],
            toUpdate: [],
          }
        );

        console.log('exceptionItemsToAdd', itemsMap.toAdd);
        console.log('exceptionItemToEdit', itemsMap.toUpdate);
        console.log(alertIdToClose);
        if (itemsMap.toAdd.length > 0) {
          await addExceptionListItem({
            http,
            listItem: itemsMap.toAdd[0],
            signal: abortCtrl.signal,
          });
        }
        if (itemsMap.toUpdate.length > 0) {
          await updateExceptionListItem({
            http,
            listItem: itemsMap.toUpdate[0],
            signal: abortCtrl.signal,
          });
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
        if (isSubscribed) {
          onSuccess();
        }
      } catch (error) {
        if (isSubscribed) {
          onError(error);
        }
      }
      if (isSubscribed) {
        setIsLoading(false);
      }
    };

    addException.current = addExceptionItems;
    return (): void => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [http, onSuccess, onError]);

  return [{ isLoading }, addException.current];
};
