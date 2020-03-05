/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import {
  useRouteMatch,
  HashRouter as Router,
  Switch,
  Route,
  Redirect,
  useHistory,
} from 'react-router-dom';
import { AGENT_CONFIG_DETAILS_PATH } from '../../../constants';
import { AgentConfig, PackageInfo, NewDatasource } from '../../../types';
import { useLink } from '../../../hooks';
import { useLinks as useEPMLinks } from '../../epm/hooks';
import { CreateDatasourcePageLayout } from './components';
import { CreateDatasourceFrom, CreateDatasourceStep } from './types';
import { CREATE_DATASOURCE_STEP_PATHS } from './constants';
import { StepSelectPackage } from './steps';

export const CreateDatasourcePage: React.FunctionComponent = () => {
  const {
    params: { configId, pkgkey },
    path: matchPath,
    url: basePath,
  } = useRouteMatch();
  const history = useHistory();
  const from: CreateDatasourceFrom = configId ? 'config' : 'package';
  const [maxStep, setMaxStep] = useState<CreateDatasourceStep | ''>('');

  // Cancel url
  const CONFIG_URI = useLink(`${AGENT_CONFIG_DETAILS_PATH}${configId}`);
  const PACKAGE_URI = useEPMLinks().toDetailView({
    name: (pkgkey || '-').split('-')[0],
    version: (pkgkey || '-').split('-')[1],
  });
  const cancelUrl = from === 'config' ? CONFIG_URI : PACKAGE_URI;

  // Agent config and package info states
  const [agentConfig, setAgentConfig] = useState<AgentConfig>();
  const [packageInfo, setPackageInfo] = useState<PackageInfo>();

  // New datasource state
  const [datasource, setDatasource] = useState<NewDatasource>({
    name: '',
    config_id: configId || '',
    enabled: true,
    output_id: '',
    inputs: [],
  });

  // Update datasource method
  const updateDatasource = (updatedFields: Partial<NewDatasource>) => {
    setDatasource({
      ...datasource,
      ...updatedFields,
    });
  };

  const layoutProps = {
    from,
    basePath,
    cancelUrl,
    maxStep,
    agentConfig,
    packageInfo,
  };

  return (
    <Router>
      <Switch>
        {from === 'config' ? (
          <Redirect
            exact
            from={`${matchPath}`}
            to={`${matchPath}${CREATE_DATASOURCE_STEP_PATHS.selectPackage}`}
          />
        ) : (
          <Redirect
            exact
            from={`${matchPath}`}
            to={`${matchPath}${CREATE_DATASOURCE_STEP_PATHS.selectConfig}`}
          />
        )}
        {from === 'config' ? (
          <Route path={`${matchPath}${CREATE_DATASOURCE_STEP_PATHS.selectPackage}`}>
            <CreateDatasourcePageLayout
              {...layoutProps}
              restrictWidth={770}
              currentStep="selectPackage"
            >
              <StepSelectPackage
                agentConfigId={configId}
                setAgentConfig={setAgentConfig}
                packageInfo={packageInfo}
                setPackageInfo={setPackageInfo}
                cancelUrl={cancelUrl}
                onNext={() => {
                  setMaxStep('selectPackage');
                  history.push(`${basePath}${CREATE_DATASOURCE_STEP_PATHS.configure}`);
                }}
              />
            </CreateDatasourcePageLayout>
          </Route>
        ) : (
          <Route path={`${matchPath}${CREATE_DATASOURCE_STEP_PATHS.selectConfig}`}>
            <CreateDatasourcePageLayout {...layoutProps} currentStep="selectConfig">
              <span>Select config</span>
            </CreateDatasourcePageLayout>
          </Route>
        )}
        <Route path={`${matchPath}${CREATE_DATASOURCE_STEP_PATHS.configure}`}>
          <CreateDatasourcePageLayout {...layoutProps} currentStep="configure">
            <span>Configure data source</span>
          </CreateDatasourcePageLayout>
        </Route>
        <Route path={`${matchPath}${CREATE_DATASOURCE_STEP_PATHS.review}`}>
          <CreateDatasourcePageLayout {...layoutProps} currentStep="review">
            <span>Select package</span>
          </CreateDatasourcePageLayout>
        </Route>
      </Switch>
    </Router>
  );
};
