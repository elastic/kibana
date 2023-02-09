/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Redirect, Route, Switch, useParams } from 'react-router-dom';

import { useActions } from 'kea';

import { generateEncodedPath } from '../../../shared/encode_path_params';
import { ENGINE_PATH, ENGINE_TAB_PATH, EngineViewTabs } from '../../routes';

import { EngineNameLogic } from './engine_name_logic';
import { EngineView } from './engine_view';

export const EngineRouter: React.FC = () => {
  const engineName = decodeURIComponent(useParams<{ engineName: string }>().engineName);
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
        from={ENGINE_PATH}
        to={generateEncodedPath(ENGINE_TAB_PATH, {
          engineName,
          tabId: EngineViewTabs.OVERVIEW,
        })}
        exact
      />
      <Route path={ENGINE_TAB_PATH}>
        <EngineView />
      </Route>
    </Switch>
  );
};
