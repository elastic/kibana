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
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButtonEmpty } from '@elastic/eui';
import { AGENT_CONFIG_DETAILS_PATH } from '../../../constants';
import { AgentConfig, PackageInfo, NewDatasource } from '../../../types';
import { useLink, sendCreateDatasource } from '../../../hooks';
import { useLinks as useEPMLinks } from '../../epm/hooks';
import { CreateDatasourcePageLayout } from './components';
import { CreateDatasourceFrom, CreateDatasourceStep } from './types';
import { CREATE_DATASOURCE_STEP_PATHS } from './constants';
import { StepSelectPackage } from './step_select_package';
import { StepSelectConfig } from './step_select_config';
import { StepConfigureDatasource } from './step_configure_datasource';
import { StepReviewDatasource } from './step_review';

export const CreateDatasourcePage: React.FunctionComponent = () => {
  const {
    params: { configId, pkgkey },
    path: matchPath,
    url: basePath,
  } = useRouteMatch();
  const history = useHistory();
  const from: CreateDatasourceFrom = configId ? 'config' : 'package';
  const [maxStep, setMaxStep] = useState<CreateDatasourceStep | ''>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Agent config and package info states
  const [agentConfig, setAgentConfig] = useState<AgentConfig>();
  const [packageInfo, setPackageInfo] = useState<PackageInfo>();

  // New datasource state
  const [datasource, setDatasource] = useState<NewDatasource>({
    name: '',
    description: '',
    config_id: '',
    enabled: true,
    output_id: '', // TODO: Blank for now as we only support default output
    inputs: [],
  });

  // Update package info method
  const updatePackageInfo = (updatedPackageInfo: PackageInfo | undefined) => {
    if (updatedPackageInfo) {
      setPackageInfo(updatedPackageInfo);
    } else {
      setPackageInfo(undefined);
      setMaxStep('');
    }

    // eslint-disable-next-line no-console
    console.debug('Package info updated', updatedPackageInfo);
  };

  // Update agent config method
  const updateAgentConfig = (updatedAgentConfig: AgentConfig | undefined) => {
    if (updatedAgentConfig) {
      setAgentConfig(updatedAgentConfig);
    } else {
      setAgentConfig(undefined);
      setMaxStep('');
    }

    // eslint-disable-next-line no-console
    console.debug('Agent config updated', updatedAgentConfig);
  };

  // Update datasource method
  const updateDatasource = (updatedFields: Partial<NewDatasource>) => {
    const newDatasource = {
      ...datasource,
      ...updatedFields,
    };
    setDatasource(newDatasource);

    // eslint-disable-next-line no-console
    console.debug('Datasource updated', newDatasource);
  };

  // Cancel url
  const CONFIG_URL = useLink(
    `${AGENT_CONFIG_DETAILS_PATH}${agentConfig ? agentConfig.id : configId}`
  );
  const PACKAGE_URL = useEPMLinks().toDetailView({
    name: (pkgkey || '-').split('-')[0],
    version: (pkgkey || '-').split('-')[1],
  });
  const cancelUrl = from === 'config' ? CONFIG_URL : PACKAGE_URL;

  // Redirect to first step
  const redirectToFirstStep =
    from === 'config' ? (
      <Redirect to={`${basePath}${CREATE_DATASOURCE_STEP_PATHS.selectPackage}`} />
    ) : (
      <Redirect to={`${basePath}${CREATE_DATASOURCE_STEP_PATHS.selectConfig}`} />
    );

  // Url to first and second steps
  const SELECT_PACKAGE_URL = useLink(`${basePath}${CREATE_DATASOURCE_STEP_PATHS.selectPackage}`);
  const SELECT_CONFIG_URL = useLink(`${basePath}${CREATE_DATASOURCE_STEP_PATHS.selectConfig}`);
  const CONFIGURE_DATASOURCE_URL = useLink(`${basePath}${CREATE_DATASOURCE_STEP_PATHS.configure}`);
  const firstStepUrl = from === 'config' ? SELECT_PACKAGE_URL : SELECT_CONFIG_URL;
  const secondStepUrl = CONFIGURE_DATASOURCE_URL;

  // Redirect to second step
  const redirectToSecondStep = (
    <Redirect to={`${basePath}${CREATE_DATASOURCE_STEP_PATHS.configure}`} />
  );

  // Save datasource
  const saveDatasource = async () => {
    setIsSaving(true);
    const result = await sendCreateDatasource(datasource);
    setIsSaving(false);
    return result;
  };

  const layoutProps = {
    from,
    basePath,
    cancelUrl,
    maxStep,
    agentConfig,
    packageInfo,
    restrictWidth: 770,
  };

  return (
    <Router>
      <Switch>
        {/* Redirect to first step from `/` */}
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

        {/* First step, either render select package or select config depending on entry */}
        {from === 'config' ? (
          <Route path={`${matchPath}${CREATE_DATASOURCE_STEP_PATHS.selectPackage}`}>
            <CreateDatasourcePageLayout {...layoutProps} currentStep="selectPackage">
              <StepSelectPackage
                agentConfigId={configId}
                updateAgentConfig={updateAgentConfig}
                packageInfo={packageInfo}
                updatePackageInfo={updatePackageInfo}
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
              <StepSelectConfig
                pkgkey={pkgkey}
                updatePackageInfo={updatePackageInfo}
                agentConfig={agentConfig}
                updateAgentConfig={updateAgentConfig}
                cancelUrl={cancelUrl}
                onNext={() => {
                  setMaxStep('selectConfig');
                  history.push(`${basePath}${CREATE_DATASOURCE_STEP_PATHS.configure}`);
                }}
              />
            </CreateDatasourcePageLayout>
          </Route>
        )}

        {/* Second step to configure data source, redirect to first step if agent config */}
        {/* or package info isn't defined (i.e. after full page reload) */}
        <Route path={`${matchPath}${CREATE_DATASOURCE_STEP_PATHS.configure}`}>
          <CreateDatasourcePageLayout {...layoutProps} currentStep="configure">
            {!agentConfig || !packageInfo ? (
              redirectToFirstStep
            ) : (
              <StepConfigureDatasource
                agentConfig={agentConfig}
                packageInfo={packageInfo}
                datasource={datasource}
                updateDatasource={updateDatasource}
                backLink={
                  <EuiButtonEmpty href={firstStepUrl} iconType="arrowLeft" iconSide="left">
                    {from === 'config' ? (
                      <FormattedMessage
                        id="xpack.ingestManager.createDatasource.changePackageLinkText"
                        defaultMessage="Change package"
                      />
                    ) : (
                      <FormattedMessage
                        id="xpack.ingestManager.createDatasource.changeConfigLinkText"
                        defaultMessage="Change configuration"
                      />
                    )}
                  </EuiButtonEmpty>
                }
                cancelUrl={cancelUrl}
                onNext={() => {
                  setMaxStep('configure');
                  history.push(`${basePath}${CREATE_DATASOURCE_STEP_PATHS.review}`);
                }}
              />
            )}
          </CreateDatasourcePageLayout>
        </Route>

        {/* Third step to review, redirect to second step if data source name is missing */}
        {/* (i.e. after full page reload) */}
        <Route path={`${matchPath}${CREATE_DATASOURCE_STEP_PATHS.review}`}>
          <CreateDatasourcePageLayout {...layoutProps} currentStep="review">
            {!agentConfig || !datasource.name ? (
              redirectToSecondStep
            ) : (
              <StepReviewDatasource
                agentConfig={agentConfig}
                datasource={datasource}
                cancelUrl={cancelUrl}
                isSubmitLoading={isSaving}
                backLink={
                  <EuiButtonEmpty href={secondStepUrl} iconType="arrowLeft" iconSide="left">
                    <FormattedMessage
                      id="xpack.ingestManager.createDatasource.editDatasourceLinkText"
                      defaultMessage="Edit data source"
                    />
                  </EuiButtonEmpty>
                }
                onSubmit={async () => {
                  const { error } = await saveDatasource();
                  if (!error) {
                    history.push(
                      `${AGENT_CONFIG_DETAILS_PATH}${agentConfig ? agentConfig.id : configId}`
                    );
                  } else {
                    // TODO: Handle save datasource error
                  }
                }}
              />
            )}
          </CreateDatasourcePageLayout>
        </Route>
      </Switch>
    </Router>
  );
};
