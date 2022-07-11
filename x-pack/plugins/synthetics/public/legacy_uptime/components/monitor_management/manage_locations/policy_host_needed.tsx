/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiLink, EuiButton } from '@elastic/eui';
import { useUptimeSettingsContext } from '../../../contexts/uptime_settings_context';

export const PolicyHostNeeded = () => {
  const { basePath } = useUptimeSettingsContext();
  return (
    <EuiCallOut title="Fleet policy host needed!" color="warning" iconType="help">
      <p>
        To add a synthetics private location, a Fleet policy with active elastic Agent is needed.
        <EuiLink href="#">Read the docs</EuiLink>.
      </p>
      <EuiButton href={`${basePath}/app/fleet/policies?create`} color="primary">
        Add a fleet policy
      </EuiButton>
    </EuiCallOut>
  );
};
