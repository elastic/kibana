/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';

import {
  MetricsSourceConfigurationProperties,
  PartialMetricsSourceConfigurationProperties,
} from '../../../common/metrics_sources';
import { RendererFunction } from '../../utils/typed_react';
import { Source } from '../metrics_source';
import { CreateDerivedIndexPattern } from '../../containers/metrics_source';

interface WithSourceProps {
  children: RendererFunction<{
    configuration?: MetricsSourceConfigurationProperties;
    create: (
      sourceProperties: PartialMetricsSourceConfigurationProperties
    ) => Promise<any> | undefined;
    createDerivedIndexPattern: CreateDerivedIndexPattern;
    exists?: boolean;
    hasFailed: boolean;
    isLoading: boolean;
    lastFailureMessage?: string;
    load: () => Promise<any> | undefined;
    logIndicesExist?: boolean;
    metricAlias?: string;
    metricIndicesExist?: boolean;
    sourceId: string;
    update: (
      sourceProperties: PartialMetricsSourceConfigurationProperties
    ) => Promise<any> | undefined;
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
    metricIndicesExist,
    sourceId,
    update: updateSourceConfiguration,
    version,
  });
};
