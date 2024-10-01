/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useTrackPageview } from '@kbn/observability-shared-plugin/public';
import {
  LogSourcesSettingSynchronisationInfo,
  useLogSourcesContext,
} from '@kbn/logs-data-access-plugin/public';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';

export const KibanaAdvancedSettingConfigurationPanel: React.FC = () => {
  const {
    services: { application },
  } = useKibanaContextForPlugin();

  useTrackPageview({ app: 'infra_logs', path: 'log_source_configuration_kibana_advanced_setting' });
  useTrackPageview({
    app: 'infra_logs',
    path: 'log_source_configuration_kibana_advanced_setting',
    delay: 15000,
  });

  const { isLoadingLogSources, combinedIndices } = useLogSourcesContext();

  return (
    <LogSourcesSettingSynchronisationInfo
      isLoading={isLoadingLogSources}
      logSourcesValue={combinedIndices}
      getUrlForApp={application.getUrlForApp}
    />
  );
};
