/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';

import { IIndexPattern } from 'src/plugins/data/public';
import { SourceQuery, UpdateSourceInput } from '../../graphql/types';
import { RendererFunction } from '../../utils/typed_react';
import { Source } from '../source';

interface WithSourceProps {
  children: RendererFunction<{
    configuration?: SourceQuery.Query['source']['configuration'];
    create: (sourceProperties: UpdateSourceInput) => Promise<any> | undefined;
    createDerivedIndexPattern: (type: 'logs' | 'metrics' | 'both') => IIndexPattern;
    exists?: boolean;
    hasFailed: boolean;
    isLoading: boolean;
    lastFailureMessage?: string;
    load: () => Promise<any> | undefined;
    logIndicesExist?: boolean;
    metricAlias?: string;
    metricIndicesExist?: boolean;
    sourceId: string;
    update: (sourceProperties: UpdateSourceInput) => Promise<any> | undefined;
    version?: string;
  }>;
}

export const WithSource: React.FunctionComponent<WithSourceProps> = ({ children }) => {
  const {
    createSourceConfiguration,
    createDerivedIndexPattern,
    source,
    sourceExists,
    sourceId,
    metricIndicesExist,
    logIndicesExist,
    isLoading,
    loadSource,
    hasFailedLoadingSource,
    loadSourceFailureMessage,
    updateSourceConfiguration,
    version,
  } = useContext(Source.Context);

  return children({
    create: createSourceConfiguration,
    configuration: source && source.configuration,
    createDerivedIndexPattern,
    exists: sourceExists,
    hasFailed: hasFailedLoadingSource,
    isLoading,
    lastFailureMessage: loadSourceFailureMessage,
    load: loadSource,
    logIndicesExist,
    metricIndicesExist,
    sourceId,
    update: updateSourceConfiguration,
    version,
  });
};
