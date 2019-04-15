/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { SourceConfigurationFlyoutState } from '../../components/source_configuration';
import { LogViewConfiguration } from '../../containers/logs/log_view_configuration';
import { Source } from '../../containers/source';

export const LogsPageProviders: React.FunctionComponent = ({ children }) => (
  <Source.Provider sourceId="default">
    <SourceConfigurationFlyoutState.Provider>
      <LogViewConfiguration.Provider>{children}</LogViewConfiguration.Provider>
    </SourceConfigurationFlyoutState.Provider>
  </Source.Provider>
);
