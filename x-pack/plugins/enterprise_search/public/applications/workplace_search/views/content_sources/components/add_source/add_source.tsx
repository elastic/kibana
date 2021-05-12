/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { i18n } from '@kbn/i18n';

import { setSuccessMessage } from '../../../../../shared/flash_messages';
import { KibanaLogic } from '../../../../../shared/kibana';
import { Loading } from '../../../../../shared/loading';
import { AppLogic } from '../../../../app_logic';
import { CUSTOM_SERVICE_TYPE } from '../../../../constants';
import { SOURCES_PATH, getSourcesPath } from '../../../../routes';
import { SourceDataItem } from '../../../../types';
import { staticSourceData } from '../../source_data';

import { AddSourceHeader } from './add_source_header';
import { AddSourceLogic, AddSourceProps, AddSourceSteps } from './add_source_logic';
import { ConfigCompleted } from './config_completed';
import { ConfigurationIntro } from './configuration_intro';
import { ConfigureCustom } from './configure_custom';
import { ConfigureOauth } from './configure_oauth';
import { ConnectInstance } from './connect_instance';
import { Reauthenticate } from './reauthenticate';
import { SaveConfig } from './save_config';
import { SaveCustom } from './save_custom';

import './add_source.scss';

export const AddSource: React.FC<AddSourceProps> = (props) => {
  const {
    initializeAddSource,
    setAddSourceStep,
    saveSourceConfig,
    createContentSource,
    resetSourceState,
  } = useActions(AddSourceLogic);
  const {
    addSourceCurrentStep,
    sourceConfigData: {
      name,
      categories,
      needsPermissions,
      accountContextOnly,
      privateSourcesEnabled,
    },
    dataLoading,
    newCustomSource,
  } = useValues(AddSourceLogic);

  const {
    serviceType,
    configuration,
    features,
    objTypes,
    sourceDescription,
    connectStepDescription,
    addPath,
  } = staticSourceData[props.sourceIndex] as SourceDataItem;

  const { isOrganization } = useValues(AppLogic);

  useEffect(() => {
    initializeAddSource(props);
    return resetSourceState;
  }, []);

  if (dataLoading) return <Loading />;

  const goToConfigurationIntro = () => setAddSourceStep(AddSourceSteps.ConfigIntroStep);
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
    setSuccessMessage(FORM_SOURCE_ADDED_SUCCESS_MESSAGE);
  };

  const header = <AddSourceHeader name={name} serviceType={serviceType} categories={categories} />;

  return (
    <>
      {addSourceCurrentStep === AddSourceSteps.ConfigIntroStep && (
        <ConfigurationIntro name={name} advanceStep={goToSaveConfig} header={header} />
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
          sourceDescription={sourceDescription}
          connectStepDescription={connectStepDescription}
          needsPermissions={!!needsPermissions}
          onFormCreated={goToFormSourceCreated}
          header={header}
        />
      )}
      {addSourceCurrentStep === AddSourceSteps.ConfigureCustomStep && (
        <ConfigureCustom
          helpText={configuration.helpText}
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
    </>
  );
};
