/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React from 'react';

import type { EmbeddableLogRateAnalysisInput } from '@kbn/aiops-log-rate-analysis/embeddable';

interface LogRateAnalysisProps {
  dummy: string;
}

export type LogRateAnalysisEmbeddableProps = Readonly<
  EmbeddableLogRateAnalysisInput & LogRateAnalysisProps
>;

const BAR_TARGET = 20;

export const LogCategorizationEmbeddable: FC<LogRateAnalysisEmbeddableProps> = ({ dummy }) => {
  return <>here be dragons: {dummy}</>;
};

// eslint-disable-next-line import/no-default-export
export default LogCategorizationEmbeddable;
