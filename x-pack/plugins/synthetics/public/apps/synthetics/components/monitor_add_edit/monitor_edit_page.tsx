/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useTrackPageview, useFetcher } from '@kbn/observability-shared-plugin/public';
import { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { useCanUsePublicLocations } from '../../../../hooks/use_capabilities';
import { EditMonitorNotFound } from './edit_monitor_not_found';
import { LoadingState } from '../monitors_page/overview/overview/monitor_detail_flyout';
import { ConfigKey, SourceType } from '../../../../../common/runtime_types';
import { getServiceLocations, selectServiceLocationsState } from '../../state';
import { ServiceAllowedWrapper } from '../common/wrappers/service_allowed_wrapper';
import { AlertingCallout } from '../common/alerting_callout/alerting_callout';
import { MonitorSteps } from './steps';
import { MonitorForm } from './form';
import { LocationsLoadingError } from './locations_loading_error';
import { MonitorDetailsLinkPortal } from './monitor_details_portal';
import { useMonitorAddEditBreadcrumbs } from './use_breadcrumbs';
import { getDecryptedMonitorAPI } from '../../state/monitor_management/api';
import { EDIT_MONITOR_STEPS } from './steps/step_config';
import { useMonitorNotFound } from './hooks/use_monitor_not_found';

export const MonitorEditPage: React.FC = () => {
  useTrackPageview({ app: 'synthetics', path: 'edit-monitor' });
  useTrackPageview({ app: 'synthetics', path: 'edit-monitor', delay: 15000 });
  const { monitorId } = useParams<{ monitorId: string }>();
  useMonitorAddEditBreadcrumbs(true);
  const dispatch = useDispatch();
  const { locationsLoaded, error: locationsError } = useSelector(selectServiceLocationsState);

  useEffect(() => {
    if (!locationsLoaded) {
      dispatch(getServiceLocations());
    }
  }, [locationsLoaded, dispatch]);

  const { data, loading, error } = useFetcher(() => {
    return getDecryptedMonitorAPI({ id: monitorId });
  }, []);

  const monitorNotFoundError = useMonitorNotFound(
    error as IHttpFetchError<ResponseErrorBody>,
    data?.id
  );

  const canUsePublicLocations = useCanUsePublicLocations(data?.[ConfigKey.LOCATIONS]);

  if (monitorNotFoundError) {
    return <EditMonitorNotFound />;
  }

  const isReadOnly =
    data?.[ConfigKey.MONITOR_SOURCE_TYPE] === SourceType.PROJECT || !canUsePublicLocations;

  const projectId = data?.[ConfigKey.PROJECT_ID];

  if (locationsError) {
    return <LocationsLoadingError />;
  }

  if (error) {
    return (
      <EuiEmptyPrompt
        iconType="warning"
        color="danger"
        title={
          <h3>
            {i18n.translate('xpack.synthetics.monitorEditPage.error.label', {
              defaultMessage: 'Unable to load monitor configuration',
            })}
          </h3>
        }
        body={
          <p>
            {i18n.translate('xpack.synthetics.monitorEditPage.error.content', {
              defaultMessage: 'There was an error loading your monitor. Please try again later.',
            })}
          </p>
        }
      />
    );
  }

  return data && locationsLoaded && !loading && !error ? (
    <>
      <AlertingCallout isAlertingEnabled={data[ConfigKey.ALERT_CONFIG]?.status?.enabled} />
      <MonitorForm
        defaultValues={data}
        readOnly={isReadOnly}
        canUsePublicLocations={canUsePublicLocations}
      >
        <MonitorSteps
          canUsePublicLocations={canUsePublicLocations}
          stepMap={EDIT_MONITOR_STEPS(isReadOnly)}
          isEditFlow={true}
          readOnly={isReadOnly}
          projectId={projectId}
        />
        <MonitorDetailsLinkPortal
          configId={data?.[ConfigKey.CONFIG_ID]}
          name={data?.name}
          updateUrl={false}
        />
      </MonitorForm>
    </>
  ) : (
    <LoadingState />
  );
};

export const MonitorEditPageWithServiceAllowed = React.memo(() => (
  <ServiceAllowedWrapper>
    <MonitorEditPage />
  </ServiceAllowedWrapper>
));
