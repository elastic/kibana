/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate';
import { useMemo } from 'react';

import {
  useLogAnalysisModule,
  ModuleSourceConfiguration,
} from '../../../containers/logs/log_analysis';
import { logEntryCategoriesModule } from './module_descriptor';

export const useLogEntryCategoriesModule = ({
  indexPattern,
  sourceId,
  spaceId,
  timestampField,
}: {
  indexPattern: string;
  sourceId: string;
  spaceId: string;
  timestampField: string;
}) => {
  const sourceConfiguration: ModuleSourceConfiguration = useMemo(
    () => ({
      indices: indexPattern.split(','),
      sourceId,
      spaceId,
      timestampField,
    }),
    [indexPattern, sourceId, spaceId, timestampField]
  );

  return useLogAnalysisModule({
    moduleDescriptor: logEntryCategoriesModule,
    sourceConfiguration,
  });
};

export const [
  LogEntryCategoriesModuleProvider,
  useLogEntryCategoriesModuleContext,
] = createContainer(useLogEntryCategoriesModule);
