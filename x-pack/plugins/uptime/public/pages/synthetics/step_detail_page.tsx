/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { useTrackPageview } from '../../../../observability/public';
import { useInitApp } from '../../hooks/use_init_app';
import { StepDetailContainer } from '../../components/monitor/synthetics/step_detail/step_detail_container';

export const StepDetailPage: React.FC = () => {
  useInitApp();
  const { checkGroupId, stepIndex } = useParams<{ checkGroupId: string; stepIndex: string }>();
  useTrackPageview({ app: 'uptime', path: 'stepDetail' });
  useTrackPageview({ app: 'uptime', path: 'stepDetail', delay: 15000 });

  return <StepDetailContainer checkGroup={checkGroupId} stepIndex={Number(stepIndex)} />;
};
