/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

import { updateAlertStatus } from '../../../detections/containers/detection_engine/alerts/api';
import { getUpdateAlertsQuery } from '../../../detections/components/alerts_table/actions';
import {
  buildAlertStatusesFilter,
  buildAlertsFilter,
} from '../../../detections/components/alerts_table/default_config';
import { getEsQueryFilter } from '../../../detections/containers/detection_engine/exceptions/get_es_query_filter';
import type { IndexPatternArray } from '../../../../common/detection_engine/rule_schema';
import { prepareExceptionItemsForBulkClose } from '../utils/helpers';
import * as i18nCommon from '../../../common/translations';
import * as i18n from './translations';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';

/**
 * Closes alerts.
 *
 * @param ruleStaticIds static id of the rules (rule.ruleId, not rule.id) where the exception updates will be applied
 * @param exceptionItems array of ExceptionListItemSchema to add or update
 * @param alertIdToClose - optional string representing alert to close
 * @param bulkCloseIndex - optional index used to create bulk close query
 *
 */
export type AddOrUpdateExceptionItemsFunc = (
  ruleStaticIds: string[],
  exceptionItems: ExceptionListItemSchema[],
  alertIdToClose?: string,
  bulkCloseIndex?: IndexPatternArray
) => Promise<void>;

export type ReturnUseCloseAlertsFromExceptions = [boolean, AddOrUpdateExceptionItemsFunc | null];

/**
 * Hook for closing alerts from exceptions
 */
export const useCloseAlertsFromExceptions = (): ReturnUseCloseAlertsFromExceptions => {
  const { addSuccess, addError, addWarning } = useAppToasts();

  const [isLoading, setIsLoading] = useState(false);
  const closeAlertsRef = useRef<AddOrUpdateExceptionItemsFunc | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const onUpdateAlerts: AddOrUpdateExceptionItemsFunc = async (
      ruleStaticIds,
      exceptionItems,
      alertIdToClose,
      bulkCloseIndex
    ) => {
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

          const filter = await getEsQueryFilter(
            '',
            'kuery',
            [...ruleStaticIds.flatMap((id) => buildAlertsFilter(id)), ...alertStatusFilter],
            bulkCloseIndex,
            prepareExceptionItemsForBulkClose(exceptionItems),
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
          addSuccess(i18n.CLOSE_ALERTS_SUCCESS(updated));
          if (conflicts > 0) {
            addWarning({
              title: i18nCommon.UPDATE_ALERT_STATUS_FAILED(conflicts),
              text: i18nCommon.UPDATE_ALERT_STATUS_FAILED_DETAILED(updated, conflicts),
            });
          }
        }
      } catch (error) {
        if (isSubscribed) {
          setIsLoading(false);
          addError(error, { title: i18n.CLOSE_ALERTS_ERROR });
        }
      }
    };

    closeAlertsRef.current = onUpdateAlerts;
    return (): void => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [addSuccess, addError, addWarning]);

  return [isLoading, closeAlertsRef.current];
};
