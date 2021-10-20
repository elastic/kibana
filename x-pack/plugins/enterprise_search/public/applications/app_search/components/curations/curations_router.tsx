/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Route, Switch } from 'react-router-dom';

import { useValues, useActions } from 'kea';

import { LicensingLogic } from '../../../shared/licensing';
import {
  ENGINE_CURATIONS_PATH,
  ENGINE_CURATIONS_NEW_PATH,
  ENGINE_CURATION_PATH,
  ENGINE_CURATION_SUGGESTION_PATH,
} from '../../routes';
import { LogRetentionLogic, LogRetentionOptions } from '../log_retention';

import { Curation } from './curation';
import { Curations, CurationCreation, CurationSuggestion } from './views';
import { CurationsSettingsLogic } from './views/curations_settings';

export const CurationsRouter: React.FC = () => {
  // We need to loadCurationsSettings here so they are available across all views

  const { hasPlatinumLicense } = useValues(LicensingLogic);

  const { loadCurationsSettings, onSkipLoadingCurationsSettings } =
    useActions(CurationsSettingsLogic);

  const { logRetention } = useValues(LogRetentionLogic);
  const { fetchLogRetention } = useActions(LogRetentionLogic);

  const analyticsDisabled = !logRetention?.[LogRetentionOptions.Analytics].enabled;

  useEffect(() => {
    if (hasPlatinumLicense) {
      fetchLogRetention();
    }
  }, [hasPlatinumLicense]);

  useEffect(() => {
    if (logRetention) {
      if (!analyticsDisabled) {
        loadCurationsSettings();
      } else {
        onSkipLoadingCurationsSettings();
      }
    }
  }, [logRetention]);

  return (
    <Switch>
      <Route exact path={ENGINE_CURATIONS_PATH}>
        <Curations />
      </Route>
      <Route exact path={ENGINE_CURATIONS_NEW_PATH}>
        <CurationCreation />
      </Route>
      <Route exact path={ENGINE_CURATION_SUGGESTION_PATH}>
        <CurationSuggestion />
      </Route>
      <Route path={ENGINE_CURATION_PATH}>
        <Curation />
      </Route>
    </Switch>
  );
};
