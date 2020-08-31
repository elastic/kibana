/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import React from 'react';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { SourceConfigurationSettings } from '../../components/source_configuration/source_configuration_settings';

export const MetricsSettingsPage = () => {
  const uiCapabilities = useKibana().services.application?.capabilities;
  return (
    <EuiErrorBoundary>
      <SourceConfigurationSettings
        shouldAllowEdit={uiCapabilities?.infrastructure?.configureSource as boolean}
      />
    </EuiErrorBoundary>
  );
};
