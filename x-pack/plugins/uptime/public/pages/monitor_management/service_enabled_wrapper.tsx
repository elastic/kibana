/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt, EuiLoadingLogo } from '@elastic/eui';
import { useServiceEnabled } from '../../components/monitor_management/hooks/use_service_enabled';

export const ServiceEnabledWrapper: React.FC = ({ children }) => {
  const { data, loading } = useServiceEnabled();

  if (loading) {
    return (
      <EuiEmptyPrompt
        icon={<EuiLoadingLogo logo="logoKibana" size="xl" />}
        title={<h2>Loading monitor managment</h2>}
      />
    );
  }

  if (!data?.serviceEnabled) {
    return (
      <EuiEmptyPrompt
        title={<h2>Monitor management</h2>}
        body={
          <p>
            Monitor management is available as synthetics public beta for select users. With public
            beta access you will be able to add HTTP, TCP, ICMP and Browser checks using monitor
            management and they will be executed using Elastic managed synthetics service.
          </p>
        }
        actions={[
          <EuiButton color="primary" fill>
            Request access
          </EuiButton>,
        ]}
      />
    );
  }

  return <>{children}</>;
};
