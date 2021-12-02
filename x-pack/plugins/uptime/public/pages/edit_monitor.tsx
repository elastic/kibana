/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiEmptyPromptProps, EuiLoadingLogo, EuiSpacer } from '@elastic/eui';
import { useParams } from 'react-router-dom';
import { useTrackPageview, FETCH_STATUS, useFetcher } from '../../../observability/public';
import { EditMonitorConfig } from '../components/monitor_management/edit_monitor_config';
import { getMonitor } from '../state/api';
import { SyntheticsMonitorSavedObject } from '../../common/types';

export const EditMonitorPage: React.FC = () => {
  useTrackPageview({ app: 'uptime', path: 'edit-monitor' });
  useTrackPageview({ app: 'uptime', path: 'edit-monitor', delay: 15000 });
  const { monitorId } = useParams<{ monitorId: string }>();

  const { data, status } = useFetcher<Promise<SyntheticsMonitorSavedObject | undefined>>(() => {
    return getMonitor({ id: Buffer.from(monitorId, 'base64').toString('utf8') });
  }, [monitorId]);

  const monitor = data?.attributes;

  let emptyPromptProps: Partial<EuiEmptyPromptProps>;
  switch (status) {
    case FETCH_STATUS.FAILURE:
      emptyPromptProps = {
        color: 'danger',
        iconType: 'alert',
        title: <h2>Error loading monitor configuration</h2>,
        body: (
          <p>
            There was an error loading the the monitor configuration. Contact your administrator for
            help.
          </p>
        ),
      };
      break;
    default:
      emptyPromptProps = {
        color: 'subdued',
        icon: <EuiLoadingLogo logo="logoKibana" size="xl" />,
        title: <h2>Loading monitor</h2>,
      };
      break;
  }

  return status === FETCH_STATUS.SUCCESS && monitor ? (
    <EditMonitorConfig monitor={monitor} />
  ) : (
    <>
      <EuiSpacer size="xxl" />
      <EuiEmptyPrompt {...emptyPromptProps} />
    </>
  );
};
