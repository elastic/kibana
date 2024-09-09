/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';

import { useValues } from 'kea';

import { Route, Routes } from '@kbn/shared-ux-router';

import { isVersionMismatch } from '../../../common/is_version_mismatch';
import { InitialAppData } from '../../../common/types';
import { ErrorStatePrompt } from '../shared/error_state';
import { HttpLogic } from '../shared/http';
import { VersionMismatchPage } from '../shared/version_mismatch';

import { InferenceEndpoints } from './components/inference_endpoints';
import { NotFound } from './components/not_found';
import { INFERENCE_ENDPOINTS_PATH, ERROR_STATE_PATH, ROOT_PATH } from './routes';

export const EnterpriseSearchRelevance: React.FC<InitialAppData> = (props) => {
  const { errorConnectingMessage } = useValues(HttpLogic);
  const { enterpriseSearchVersion, kibanaVersion } = props;
  const incompatibleVersions = isVersionMismatch(enterpriseSearchVersion, kibanaVersion);

  const showView = () => {
    if (incompatibleVersions) {
      return (
        <VersionMismatchPage
          enterpriseSearchVersion={enterpriseSearchVersion}
          kibanaVersion={kibanaVersion}
        />
      );
    }

    return <EnterpriseSearchRelevanceConfigured {...(props as Required<InitialAppData>)} />;
  };

  return (
    <Routes>
      <Route exact path={ERROR_STATE_PATH}>
        {errorConnectingMessage ? <ErrorStatePrompt /> : <Redirect to={INFERENCE_ENDPOINTS_PATH} />}
      </Route>
      <Route>{showView()}</Route>
    </Routes>
  );
};

export const EnterpriseSearchRelevanceConfigured: React.FC<Required<InitialAppData>> = () => {
  return (
    <Routes>
      <Redirect exact from={ROOT_PATH} to={INFERENCE_ENDPOINTS_PATH} />
      <Route path={INFERENCE_ENDPOINTS_PATH}>
        <InferenceEndpoints />
      </Route>
      <Route>
        <NotFound />
      </Route>
    </Routes>
  );
};
