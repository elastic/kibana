/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { CustomConfigureDatasourceContent } from '../../../../../ingest_manager/public';

export const ConfigureEndpointDatasource: CustomConfigureDatasourceContent = ({
  datasource,
  from,
}) => {
  return (
    <div>{`Custom endpoint rendering for ${datasource.name} ${
      from === 'edit' ? '(editing)' : '(creating)'
    }`}</div>
  );
};
