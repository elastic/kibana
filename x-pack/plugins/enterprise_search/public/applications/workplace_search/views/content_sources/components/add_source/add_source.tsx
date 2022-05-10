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
import { NAV } from '../../../../constants';
import { SOURCES_PATH, getSourcesPath, getAddPath } from '../../../../routes';

import { hasMultipleConnectorOptions } from '../../../../utils';

import { SourcesLogic } from '../../sources_logic';

import { AddSourceHeader } from './add_source_header';
import { AddSourceLogic, AddSourceProps, AddSourceSteps } from './add_source_logic';
import { ConfigCompleted } from './config_completed';
import { ConfigurationChoice } from './configuration_choice';
import { ConfigurationIntro } from './configuration_intro';
import { ConfigureOauth } from './configure_oauth';
import { ConnectInstance } from './connect_instance';
import { Reauthenticate } from './reauthenticate';
import { SaveConfig } from './save_config';

import './add_source.scss';

export const AddSource: React.FC<AddSourceProps> = (props) => {
  const { initializeAddSource, setAddSourceStep, saveSourceConfig, resetSourceState } =
    useActions(AddSourceLogic);
  const { addSourceCurrentStep, sourceConfigData, dataLoading } = useValues(AddSourceLogic);
  const { name, categories, needsPermissions, accountContextOnly, privateSourcesEnabled } =
    sourceConfigData;
  const { serviceType, configuration, features, objTypes } = props.sourceData;
  const addPath = getAddPath(serviceType);
  const { isOrganization } = useValues(AppLogic);
  const { externalConfigured } = useValues(SourcesLogic);

  useEffect(() => {
    initializeAddSource(props);
    return resetSourceState;
  }, []);

  const goToConfigurationIntro = () => setAddSourceStep(AddSourceSteps.ConfigIntroStep);
  const goToSaveConfig = () => setAddSourceStep(AddSourceSteps.SaveConfigStep);
  const setConfigCompletedStep = () => setAddSourceStep(AddSourceSteps.ConfigCompletedStep);
  const goToConfigCompleted = () => saveSourceConfig(false, setConfigCompletedStep);
  const goToChoice = () => setAddSourceStep(AddSourceSteps.ChoiceStep);
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

  const goToFormSourceCreated = () => {
    KibanaLogic.values.navigateToUrl(`${getSourcesPath(SOURCES_PATH, isOrganization)}`);
    flashSuccessToast(FORM_SOURCE_ADDED_SUCCESS_MESSAGE);
  };

  const header = <AddSourceHeader name={name} serviceType={serviceType} categories={categories} />;
  const Layout = isOrganization ? WorkplaceSearchPageTemplate : PersonalDashboardLayout;

  return (
    <Layout pageChrome={[NAV.SOURCES, NAV.ADD_SOURCE, name || '...']} isLoading={dataLoading}>
      {addSourceCurrentStep === AddSourceSteps.ConfigIntroStep && (
        <ConfigurationIntro
          name={name}
          // TODO: Remove this once we can support multiple external connectors
          advanceStep={
            hasMultipleConnectorOptions(props.sourceData) && !externalConfigured
              ? goToChoice
              : goToSaveConfig
          }
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
          showFeedbackLink={serviceType === 'external'}
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
      {addSourceCurrentStep === AddSourceSteps.ConfigureOauthStep && (
        <ConfigureOauth name={name} onFormCreated={goToFormSourceCreated} header={header} />
      )}
      {addSourceCurrentStep === AddSourceSteps.ReauthenticateStep && (
        <Reauthenticate name={name} header={header} />
      )}
      {addSourceCurrentStep === AddSourceSteps.ChoiceStep && (
        <ConfigurationChoice sourceData={props.sourceData} goToInternalStep={goToSaveConfig} />
      )}
    </Layout>
  );
};
