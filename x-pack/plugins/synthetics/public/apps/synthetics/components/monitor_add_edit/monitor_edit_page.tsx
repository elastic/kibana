/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useTrackPageview, useFetcher } from '@kbn/observability-plugin/public';
import { LoadingState } from '../monitors_page/overview/overview/monitor_detail_flyout';
import { ConfigKey } from '../../../../../common/runtime_types';
import { getServiceLocations } from '../../state';
import { ServiceAllowedWrapper } from '../common/wrappers/service_allowed_wrapper';
import { MonitorSteps } from './steps';
import { MonitorForm } from './form';
import { MonitorDetailsLinkPortal } from './monitor_details_portal';
import { useMonitorAddEditBreadcrumbs } from './use_breadcrumbs';
import { getMonitorAPI } from '../../state/monitor_management/api';
import { EDIT_MONITOR_STEPS } from './steps/step_config';

const MonitorEditPage: React.FC = () => {
  useTrackPageview({ app: 'synthetics', path: 'edit-monitor' });
  useTrackPageview({ app: 'synthetics', path: 'edit-monitor', delay: 15000 });
  const { monitorId } = useParams<{ monitorId: string }>();
  useMonitorAddEditBreadcrumbs(true);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getServiceLocations());
  }, [dispatch]);

  const { data, loading, error } = useFetcher(() => {
    return getMonitorAPI({ id: monitorId });
  }, []);

  return data && !loading && !error ? (
    <MonitorForm defaultValues={data?.attributes}>
      <MonitorSteps stepMap={EDIT_MONITOR_STEPS} isEditFlow={true} />
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
