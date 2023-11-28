/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FETCH_STATUS, useFetcher } from '@kbn/observability-shared-plugin/public';
import { useEffect } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useDispatch, useSelector } from 'react-redux';
import { useSyntheticsRefreshContext } from '../../contexts';
import { cleanMonitorListState, selectServiceLocationsState } from '../../state';
import { showSyncErrors } from '../monitors_page/management/show_sync_errors';
import { createGettingStartedMonitor, UpsertMonitorResponse } from '../../state';
import { DEFAULT_FIELDS } from '../../../../../common/constants/monitor_defaults';
import { ConfigKey } from '../../../../../common/constants/monitor_management';
import {
  MonitorTypeEnum,
  EncryptedSyntheticsSavedMonitor,
  ServiceLocationErrors,
} from '../../../../../common/runtime_types';
import {
  MONITOR_SUCCESS_LABEL,
  MONITOR_FAILURE_LABEL,
  SimpleFormData,
} from './simple_monitor_form';
import { kibanaService } from '../../../../utils/kibana_service';

export const useSimpleMonitor = ({ monitorData }: { monitorData?: SimpleFormData }) => {
  const { application } = useKibana().services;
  const { locations: serviceLocations } = useSelector(selectServiceLocationsState);

  const dispatch = useDispatch();

  const { refreshApp } = useSyntheticsRefreshContext();

  const { data, loading, status } = useFetcher(() => {
    if (!monitorData) {
      return new Promise<undefined>((resolve) => resolve(undefined));
    }
    const { urls, locations } = monitorData;

    return createGettingStartedMonitor({
      monitor: {
        ...DEFAULT_FIELDS.browser,
        'source.inline.script': `step('Go to ${urls}', async () => {
  await page.goto('${urls}');
});`,
        [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.BROWSER,
        [ConfigKey.NAME]: urls,
        [ConfigKey.LOCATIONS]: locations,
        [ConfigKey.URLS]: urls,
      },
    });
  }, [monitorData]);

  useEffect(() => {
    const newMonitor = data as UpsertMonitorResponse;
    const hasErrors = data && 'attributes' in data && data.attributes.errors?.length > 0;
    if (hasErrors && !loading) {
      showSyncErrors(
        (data as { attributes: { errors: ServiceLocationErrors } })?.attributes.errors ?? [],
        serviceLocations,
        kibanaService.toasts
      );
    }

    if (!loading && status === FETCH_STATUS.FAILURE) {
      kibanaService.toasts.addDanger({
        title: MONITOR_FAILURE_LABEL,
        toastLifeTimeMs: 3000,
      });
    } else if (!loading && (newMonitor as EncryptedSyntheticsSavedMonitor)?.id) {
      kibanaService.toasts.addSuccess({
        title: MONITOR_SUCCESS_LABEL,
        toastLifeTimeMs: 3000,
      });
      refreshApp();
      dispatch(cleanMonitorListState());
      application?.navigateToApp('synthetics', { path: 'monitors' });
    }
  }, [application, data, status, dispatch, loading, refreshApp, serviceLocations]);

  return { data: data as EncryptedSyntheticsSavedMonitor, loading };
};
