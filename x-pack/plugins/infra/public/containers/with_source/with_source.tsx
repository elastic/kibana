/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';

import { IIndexPattern } from 'src/plugins/data/public';
import {
  InfraSavedSourceConfiguration,
  InfraSourceConfiguration,
} from '../../../common/http_api/source_api';
import { RendererFunction } from '../../utils/typed_react';
import { Source } from '../source';

interface WithSourceProps {
  children: RendererFunction<{
    configuration?: InfraSourceConfiguration;
    create: (sourceProperties: InfraSavedSourceConfiguration) => Promise<any> | undefined;
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
    update: (sourceProperties: InfraSavedSourceConfiguration) => Promise<any> | undefined;
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
