/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { AgentConfig, PackageConfig } from '../../../../../types';
import { NoPackageConfigs } from './no_package_configs';
import { PackageConfigsTable } from './package_configs_table';

export const ConfigPackageConfigsView = memo<{ config: AgentConfig }>(({ config }) => {
  if (config.package_configs.length === 0) {
    return <NoPackageConfigs configId={config.id} />;
  }

  return (
    <PackageConfigsTable
      config={config}
      packageConfigs={(config.package_configs || []) as PackageConfig[]}
    />
  );
});
