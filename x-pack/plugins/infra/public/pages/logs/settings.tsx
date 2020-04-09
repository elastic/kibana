/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { SourceConfigurationSettings } from '../../components/source_configuration/source_configuration_settings';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';

export const LogsSettingsPage = () => {
  const uiCapabilities = useKibana().services.application?.capabilities;
  return (
    <SourceConfigurationSettings
      shouldAllowEdit={uiCapabilities?.logs?.configureSource as boolean}
      displaySettings="logs"
    />
  );
};
