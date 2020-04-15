/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { AgentConfig, Datasource } from '../../../../../../../../common/types/models';
import { NoDatasources } from './no_datasources';
import { DatasourcesTable } from './datasources_table';

export const ConfigDatasourcesView = memo<{ config: AgentConfig }>(({ config }) => {
  if (config.datasources.length === 0) {
    return <NoDatasources configId={config.id} />;
  }

  return (
    <DatasourcesTable config={config} datasources={(config.datasources || []) as Datasource[]} />
  );
});
