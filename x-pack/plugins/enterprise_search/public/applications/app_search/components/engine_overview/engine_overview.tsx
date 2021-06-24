/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { AppLogic } from '../../app_logic';
import { EngineLogic } from '../engine';

import { EmptyEngineOverview } from './engine_overview_empty';

import { EngineOverviewMetrics } from './engine_overview_metrics';

export const EngineOverview: React.FC = () => {
  const {
    myRole: { canManageEngineDocuments, canViewEngineCredentials },
  } = useValues(AppLogic);
  const { isEngineEmpty, isMetaEngine } = useValues(EngineLogic);

  const canAddDocuments = canManageEngineDocuments && canViewEngineCredentials;
  const showEngineOverview = !isEngineEmpty || !canAddDocuments || isMetaEngine;

  return (
    <div data-test-subj="EngineOverview">
      {showEngineOverview ? <EngineOverviewMetrics /> : <EmptyEngineOverview />}
    </div>
  );
};
