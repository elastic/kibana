/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { i18n } from '@kbn/i18n';

import { flashSuccessToast } from '../../../../../shared/flash_messages';
import { KibanaLogic } from '../../../../../shared/kibana';
import { AppLogic } from '../../../../app_logic';
import {
  WorkplaceSearchPageTemplate,
  PersonalDashboardLayout,
} from '../../../../components/layout';
import { NAV, CUSTOM_SERVICE_TYPE } from '../../../../constants';
import {
  SOURCES_PATH,
  getSourcesPath,
  ADD_EXTERNAL_PATH,
  getAddPath,
  ADD_CUSTOM_PATH,
} from '../../../../routes';

import { AddSourceHeader } from './add_source_header';
import { AddSourceLogic, AddSourceProps, AddSourceSteps } from './add_source_logic';
import { ConfigCompleted } from './config_completed';
import { ConfigurationExternalChoice } from './configuration_external_choice';
import { ConfigurationIntro } from './configuration_intro';
import { ConfigureCustom } from './configure_custom';
import { ConfigureOauth } from './configure_oauth';
import { ConnectInstance } from './connect_instance';
import { ExternalConnectorConfig } from './external_connector_config';
import { Reauthenticate } from './reauthenticate';
import { SaveConfig } from './save_config';
import { SaveCustom } from './save_custom';

import './add_source.scss';

export const AddSource: React.FC<AddSourceProps> = (props) => {
  const {
    initializeAddSource,
    goToFirstStep,
    setAddSourceStep,
    saveSourceConfig,
    createContentSource,
    resetSourceState,
  } = useActions(AddSourceLogic);
  const { addSourceCurrentStep, sourceConfigData, dataLoading, newCustomSource } =
    useValues(AddSourceLogic);
  const { name, categories, needsPermissions, accountContextOnly, privateSourcesEnabled } =
    sourceConfigData;
  const { serviceType, configuration, features, objTypes } = props.sourceData;
  const addPath = getAddPath(serviceType);
  const { isOrganization } = useValues(AppLogic);

  useEffect(() => {
    initializeAddSource(props);
    return resetSourceState;
  }, []);

  const goToConfigurationIntro = () => setAddSourceStep(AddSourceSteps.ConfigIntroStep);
  const goToExternalChoice = () => setAddSourceStep(AddSourceSteps.ConfigChoiceStep);
  // TODO: Fix this once we have more than just Sharepoint here
  const goToExternalConfig = () =>
    KibanaLogic.values.navigateToUrl(`${getSourcesPath(ADD_EXTERNAL_PATH, isOrganization)}/`);
  const goToCustomConfig = () =>
    KibanaLogic.values.navigateToUrl(`${getSourcesPath(ADD_CUSTOM_PATH, isOrganization)}/`);
  const goToSaveConfig = () => setAddSourceStep(AddSourceSteps.SaveConfigStep);
  const setConfigCompletedStep = () => setAddSourceStep(AddSourceSteps.ConfigCompletedStep);
  const goToConfigCompleted = () => saveSourceConfig(false, setConfigCompletedStep);
  const FORM_SOURCE_ADDED_SUCCESS_MESSAGE = i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.contentSource.formSourceAddedSuccessMessage',
    {
      defaultMessage: '{name} connected',
      values: { name },
    }
  );

  const goToConnectInstance = () => {
    setAddSourceStep(AddSourceSteps.ConnectInstanceStep);
    KibanaLogic.values.navigateToUrl(`${getSourcesPath(addPath, isOrganization)}/connect`);
  };

  const saveCustomSuccess = () => setAddSourceStep(AddSourceSteps.SaveCustomStep);
  const goToSaveCustom = () => createContentSource(CUSTOM_SERVICE_TYPE, saveCustomSuccess);

  const goToFormSourceCreated = () => {
    KibanaLogic.values.navigateToUrl(`${getSourcesPath(SOURCES_PATH, isOrganization)}`);
    flashSuccessToast(FORM_SOURCE_ADDED_SUCCESS_MESSAGE);
  };

  const header = <AddSourceHeader name={name} serviceType={serviceType} categories={categories} />;
  const Layout = isOrganization ? WorkplaceSearchPageTemplate : PersonalDashboardLayout;

  return (
    <Layout pageChrome={[NAV.SOURCES, NAV.ADD_SOURCE, name || '...']} isLoading={dataLoading}>
      {addSourceCurrentStep === AddSourceSteps.ConfigChoiceStep && (
        <ConfigurationExternalChoice
          sourceData={props.sourceData}
          advanceStepInternal={goToFirstStep}
          advanceStepExternal={goToExternalConfig}
          advanceStepCustom={goToCustomConfig}
          header={header}
        />
      )}
      {addSourceCurrentStep === AddSourceSteps.ConfigIntroStep && (
        <ConfigurationIntro name={name} advanceStep={goToSaveConfig} header={header} />
      )}
      {addSourceCurrentStep === AddSourceSteps.ConfigExternalConnectorStep && (
        <ExternalConnectorConfig
          name={name}
          advanceStep={goToSaveConfig}
          goBackStep={goToExternalChoice}
          header={header}
        />
      )}
      {addSourceCurrentStep === AddSourceSteps.SaveConfigStep && (
        <SaveConfig
          name={name}
          configuration={configuration}
          advanceStep={goToConfigCompleted}
          goBackStep={goToConfigurationIntro}
          header={header}
        />
      )}
      {addSourceCurrentStep === AddSourceSteps.ConfigCompletedStep && (
        <ConfigCompleted
          name={name}
          accountContextOnly={accountContextOnly}
          advanceStep={goToConnectInstance}
          privateSourcesEnabled={privateSourcesEnabled}
          header={header}
        />
      )}
      {addSourceCurrentStep === AddSourceSteps.ConnectInstanceStep && (
        <ConnectInstance
          name={name}
          serviceType={serviceType}
          configuration={configuration}
          features={features}
          objTypes={objTypes}
          needsPermissions={!!needsPermissions}
          onFormCreated={goToFormSourceCreated}
          header={header}
        />
      )}
      {addSourceCurrentStep === AddSourceSteps.ConfigureCustomStep && (
        <ConfigureCustom
          helpText={configuration.helpText ?? ''}
          advanceStep={goToSaveCustom}
          header={header}
        />
      )}
      {addSourceCurrentStep === AddSourceSteps.ConfigureOauthStep && (
        <ConfigureOauth name={name} onFormCreated={goToFormSourceCreated} header={header} />
      )}
      {addSourceCurrentStep === AddSourceSteps.SaveCustomStep && (
        <SaveCustom
          documentationUrl={configuration.documentationUrl}
          newCustomSource={newCustomSource}
          isOrganization={isOrganization}
          header={header}
        />
      )}
      {addSourceCurrentStep === AddSourceSteps.ReauthenticateStep && (
        <Reauthenticate name={name} header={header} />
      )}
    </Layout>
  );
};
