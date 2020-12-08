/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';

import { History } from 'history';
import { useActions, useValues } from 'kea';
import { useHistory } from 'react-router-dom';

import { AppLogic } from '../../../../app_logic';
import { Loading } from '../../../../../../applications/shared/loading';
import { CUSTOM_SERVICE_TYPE } from '../../../../constants';
import { staticSourceData } from '../../source_data';
import { SourceLogic } from '../../source_logic';
import { SourceDataItem } from '../../../../types';
import { SOURCE_ADDED_PATH, getSourcesPath } from '../../../../routes';

import { AddSourceHeader } from './add_source_header';
import { ConfigCompleted } from './config_completed';
import { ConfigurationIntro } from './configuration_intro';
import { ConfigureCustom } from './configure_custom';
import { ConfigureOauth } from './configure_oauth';
import { ConnectInstance } from './connect_instance';
import { ReAuthenticate } from './re_authenticate';
import { SaveConfig } from './save_config';
import { SaveCustom } from './save_custom';

enum Steps {
  ConfigIntroStep = 'Config Intro',
  SaveConfigStep = 'Save Config',
  ConfigCompletedStep = 'Config Completed',
  ConnectInstanceStep = 'Connect Instance',
  ConfigureCustomStep = 'Configure Custom',
  ConfigureOauthStep = 'Configure Oauth',
  SaveCustomStep = 'Save Custom',
  ReAuthenticateStep = 'ReAuthenticate',
}

interface AddSourceProps {
  sourceIndex: number;
  connect?: boolean;
  configure?: boolean;
  reAuthenticate?: boolean;
}

export const AddSource: React.FC<AddSourceProps> = ({
  sourceIndex,
  connect,
  configure,
  reAuthenticate,
}) => {
  const history = useHistory() as History;
  const {
    getSourceConfigData,
    saveSourceConfig,
    createContentSource,
    resetSourceState,
  } = useActions(SourceLogic);
  const {
    sourceConfigData: {
      name,
      categories,
      needsPermissions,
      accountContextOnly,
      privateSourcesEnabled,
    },
    dataLoading,
    newCustomSource,
  } = useValues(SourceLogic);

  const {
    serviceType,
    configuration,
    features,
    objTypes,
    sourceDescription,
    connectStepDescription,
    addPath,
  } = staticSourceData[sourceIndex] as SourceDataItem;

  const { isOrganization } = useValues(AppLogic);

  useEffect(() => {
    getSourceConfigData(serviceType);
    return resetSourceState;
  }, []);

  const isCustom = serviceType === CUSTOM_SERVICE_TYPE;

  const getFirstStep = () => {
    if (isCustom) return Steps.ConfigureCustomStep;
    if (connect) return Steps.ConnectInstanceStep;
    if (configure) return Steps.ConfigureOauthStep;
    if (reAuthenticate) return Steps.ReAuthenticateStep;
    return Steps.ConfigIntroStep;
  };

  const [currentStep, setStep] = useState(getFirstStep());

  if (dataLoading) return <Loading />;

  const goToConfigurationIntro = () => setStep(Steps.ConfigIntroStep);
  const goToSaveConfig = () => setStep(Steps.SaveConfigStep);
  const setConfigCompletedStep = () => setStep(Steps.ConfigCompletedStep);
  const goToConfigCompleted = () => saveSourceConfig(false, setConfigCompletedStep);

  const goToConnectInstance = () => {
    setStep(Steps.ConnectInstanceStep);
    history.push(`${getSourcesPath(addPath, isOrganization)}/connect`);
  };

  const saveCustomSuccess = () => setStep(Steps.SaveCustomStep);
  const goToSaveCustom = () => createContentSource(CUSTOM_SERVICE_TYPE, saveCustomSuccess);

  const goToFormSourceCreated = (sourceName: string) => {
    history.push(`${getSourcesPath(SOURCE_ADDED_PATH, isOrganization)}/?name=${sourceName}`);
  };

  const header = <AddSourceHeader name={name} serviceType={serviceType} categories={categories} />;

  return (
    <>
      {currentStep === Steps.ConfigIntroStep && (
        <ConfigurationIntro name={name} advanceStep={goToSaveConfig} header={header} />
      )}
      {currentStep === Steps.SaveConfigStep && (
        <SaveConfig
          name={name}
          configuration={configuration}
          advanceStep={goToConfigCompleted}
          goBackStep={goToConfigurationIntro}
          header={header}
        />
      )}
      {currentStep === Steps.ConfigCompletedStep && (
        <ConfigCompleted
          name={name}
          accountContextOnly={accountContextOnly}
          advanceStep={goToConnectInstance}
          privateSourcesEnabled={privateSourcesEnabled}
          header={header}
        />
      )}
      {currentStep === Steps.ConnectInstanceStep && (
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
      {currentStep === Steps.ConfigureCustomStep && (
        <ConfigureCustom
          helpText={configuration.helpText}
          advanceStep={goToSaveCustom}
          header={header}
        />
      )}
      {currentStep === Steps.ConfigureOauthStep && (
        <ConfigureOauth name={name} onFormCreated={goToFormSourceCreated} header={header} />
      )}
      {currentStep === Steps.SaveCustomStep && (
        <SaveCustom
          documentationUrl={configuration.documentationUrl}
          newCustomSource={newCustomSource}
          isOrganization={isOrganization}
          header={header}
        />
      )}
      {currentStep === Steps.ReAuthenticateStep && <ReAuthenticate name={name} header={header} />}
    </>
  );
};
