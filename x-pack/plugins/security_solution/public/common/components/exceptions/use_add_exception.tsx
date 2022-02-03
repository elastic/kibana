/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type {
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { useApi } from '@kbn/securitysolution-list-hooks';
import { HttpStart } from '../../../../../../../src/core/public';

import { updateAlertStatus } from '../../../detections/containers/detection_engine/alerts/api';
import { getUpdateAlertsQuery } from '../../../detections/components/alerts_table/actions';
import {
  buildAlertsFilter,
  buildAlertStatusesFilter,
} from '../../../detections/components/alerts_table/default_config';
import { getQueryFilter } from '../../../../common/detection_engine/get_query_filter';
import { Index } from '../../../../common/detection_engine/schemas/common/schemas';
import { formatExceptionItemForUpdate, prepareExceptionItemsForBulkClose } from './helpers';
import { useKibana } from '../../lib/kibana';

/**
 * Adds exception items to the list. Also optionally closes alerts.
 *
 * @param ruleStaticId static id of the rule (rule.ruleId, not rule.id) where the exception updates will be applied
 * @param exceptionItemsToAddOrUpdate array of ExceptionListItemSchema to add or update
 * @param alertIdToClose - optional string representing alert to close
 * @param bulkCloseIndex - optional index used to create bulk close query
 *
 */
export type AddOrUpdateExceptionItemsFunc = (
  ruleStaticId: string,
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
  const { services } = useKibana();
  const [isLoading, setIsLoading] = useState(false);
  const addOrUpdateExceptionRef = useRef<AddOrUpdateExceptionItemsFunc | null>(null);
  const { addExceptionListItem, updateExceptionListItem } = useApi(services.http);
  const addOrUpdateException = useCallback<AddOrUpdateExceptionItemsFunc>(
    async (ruleStaticId, exceptionItemsToAddOrUpdate, alertIdToClose, bulkCloseIndex) => {
      if (addOrUpdateExceptionRef.current != null) {
        addOrUpdateExceptionRef.current(
          ruleStaticId,
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

    const onUpdateExceptionItemsAndAlertStatus: AddOrUpdateExceptionItemsFunc = async (
      ruleStaticId,
      exceptionItemsToAddOrUpdate,
      alertIdToClose,
      bulkCloseIndex
    ) => {
      const addOrUpdateItems = async (
        exceptionListItems: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>
      ): Promise<void> => {
        await Promise.all(
          exceptionListItems.map(
            (item: ExceptionListItemSchema | CreateExceptionListItemSchema) => {
              if ('id' in item && item.id != null) {
                const formattedExceptionItem = formatExceptionItemForUpdate(item);
                return updateExceptionListItem({
                  listItem: formattedExceptionItem,
                });
              } else {
                return addExceptionListItem({
                  listItem: item,
                });
              }
            }
          )
        );
      };

      try {
        setIsLoading(true);
        let alertIdResponse: estypes.UpdateByQueryResponse | undefined;
        let bulkResponse: estypes.UpdateByQueryResponse | undefined;
        if (alertIdToClose != null) {
          alertIdResponse = await updateAlertStatus({
            query: getUpdateAlertsQuery([alertIdToClose]),
            status: 'closed',
            signal: abortCtrl.signal,
          });
        }

        if (bulkCloseIndex != null) {
          const alertStatusFilter = buildAlertStatusesFilter([
            'open',
            'acknowledged',
            'in-progress',
          ]);

          const filter = getQueryFilter(
            '',
            'kuery',
            [...buildAlertsFilter(ruleStaticId), ...alertStatusFilter],
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

    addOrUpdateExceptionRef.current = onUpdateExceptionItemsAndAlertStatus;
    return (): void => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [addExceptionListItem, http, onSuccess, onError, updateExceptionListItem]);

  return [{ isLoading }, addOrUpdateException];
};
