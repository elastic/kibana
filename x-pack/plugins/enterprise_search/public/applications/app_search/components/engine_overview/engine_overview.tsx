/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { Loading } from '../../../shared/loading';
import { AppLogic } from '../../app_logic';
import { EngineLogic } from '../engine';

import { EmptyEngineOverview } from './engine_overview_empty';

import { EngineOverviewMetrics } from './engine_overview_metrics';

import { EngineOverviewLogic } from './';

export const EngineOverview: React.FC = () => {
  const {
    myRole: { canManageEngineDocuments, canViewEngineCredentials },
  } = useValues(AppLogic);
  const { isMetaEngine } = useValues(EngineLogic);

  const { pollForOverviewMetrics } = useActions(EngineOverviewLogic);
  const { dataLoading, documentCount } = useValues(EngineOverviewLogic);

  useEffect(() => {
    pollForOverviewMetrics();
  }, []);

  if (dataLoading) {
    return <Loading />;
  }

  const engineHasDocuments = documentCount > 0;
  const canAddDocuments = canManageEngineDocuments && canViewEngineCredentials;
  const showEngineOverview = engineHasDocuments || !canAddDocuments || isMetaEngine;

  return (
    <div data-test-subj="EngineOverview">
      {showEngineOverview ? <EngineOverviewMetrics /> : <EmptyEngineOverview />}
    </div>
  );
};
