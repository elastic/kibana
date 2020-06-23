/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { useLogSourceContext } from '../../../containers/logs/log_source';
import { useKibanaSpaceId } from '../../../utils/use_kibana_space_id';
import { LogEntryCategoriesModuleProvider } from './use_log_entry_categories_module';

export const LogEntryCategoriesPageProviders: React.FunctionComponent = ({ children }) => {
  const { sourceId, sourceConfiguration } = useLogSourceContext();
  const spaceId = useKibanaSpaceId();

  return (
    <LogEntryCategoriesModuleProvider
      indexPattern={sourceConfiguration?.configuration.logAlias ?? ''}
      sourceId={sourceId}
      spaceId={spaceId}
      timestampField={sourceConfiguration?.configuration.fields.timestamp ?? ''}
    >
      {children}
    </LogEntryCategoriesModuleProvider>
  );
};
