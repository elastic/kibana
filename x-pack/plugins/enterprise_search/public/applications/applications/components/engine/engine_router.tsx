/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Redirect, Switch, useParams } from 'react-router-dom';

import { useActions } from 'kea';

import { Route } from '@kbn/shared-ux-router';

import { generateEncodedPath } from '../../../shared/encode_path_params';
import {
  SEARCH_APPLICATION_PATH,
  SEARCH_APPLICATION_TAB_PATH,
  SearchApplicationViewTabs,
} from '../../routes';

import { EngineNameLogic } from './engine_name_logic';
import { EngineView } from './engine_view';

export const EngineRouter: React.FC = () => {
  const engineName = decodeURIComponent(
    useParams<{ searchApplicationName: string }>().searchApplicationName
  );
  const engineNameLogic = EngineNameLogic({ engineName });
  const { setEngineName } = useActions(engineNameLogic);

  useEffect(() => {
    const unmountName = engineNameLogic.mount();

    return () => {
      unmountName();
    };
  }, []);
  useEffect(() => {
    setEngineName(engineName);
  }, [engineName]);

  return (
    <Switch>
      <Redirect
        from={SEARCH_APPLICATION_PATH}
        to={generateEncodedPath(SEARCH_APPLICATION_TAB_PATH, {
          searchApplicationName: engineName,
          tabId: SearchApplicationViewTabs.PREVIEW,
        })}
        exact
      />
      <Route path={SEARCH_APPLICATION_TAB_PATH}>
        <EngineView />
      </Route>
    </Switch>
  );
};
