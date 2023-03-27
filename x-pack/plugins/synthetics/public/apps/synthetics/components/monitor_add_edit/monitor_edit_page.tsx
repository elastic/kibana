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
import { useTrackPageview, useFetcher } from '@kbn/observability-plugin/public';
import { LoadingState } from '../monitors_page/overview/overview/monitor_detail_flyout';
import { ConfigKey, SourceType } from '../../../../../common/runtime_types';
import { getServiceLocations, selectServiceLocationsState } from '../../state';
import { ServiceAllowedWrapper } from '../common/wrappers/service_allowed_wrapper';
import { MonitorSteps } from './steps';
import { MonitorForm } from './form';
import { LocationsLoadingError } from './locations_loading_error';
import { MonitorDetailsLinkPortal } from './monitor_details_portal';
import { useMonitorAddEditBreadcrumbs } from './use_breadcrumbs';
import { getMonitorAPI } from '../../state/monitor_management/api';
import { EDIT_MONITOR_STEPS } from './steps/step_config';

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
    return getMonitorAPI({ id: monitorId });
  }, []);

  const isReadOnly = data?.attributes[ConfigKey.MONITOR_SOURCE_TYPE] === SourceType.PROJECT;
  const projectId = data?.attributes[ConfigKey.PROJECT_ID];

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
    <MonitorForm defaultValues={data?.attributes} readOnly={isReadOnly}>
      <MonitorSteps
        stepMap={EDIT_MONITOR_STEPS(isReadOnly)}
        isEditFlow={true}
        readOnly={isReadOnly}
        projectId={projectId}
      />
      <MonitorDetailsLinkPortal
        configId={data?.attributes[ConfigKey.CONFIG_ID]}
        name={data?.attributes.name}
      />
    </MonitorForm>
  ) : (
    <LoadingState />
  );
};

export const MonitorEditPageWithServiceAllowed = React.memo(() => (
  <ServiceAllowedWrapper>
    <MonitorEditPage />
  </ServiceAllowedWrapper>
));
