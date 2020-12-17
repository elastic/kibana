/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';

import { useActions, useValues } from 'kea';

import { AppLogic } from '../../../../app_logic';
import { KibanaLogic } from '../../../../../shared/kibana';
import { Loading } from '../../../../../shared/loading';
import { CUSTOM_SERVICE_TYPE } from '../../../../constants';
import { staticSourceData } from '../../source_data';
import { AddSourceLogic } from './add_source_logic';
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

enum AddSourceSteps {
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
  } = useActions(AddSourceLogic);
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
  } = useValues(AddSourceLogic);

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
    if (isCustom) return AddSourceSteps.ConfigureCustomStep;
    if (connect) return AddSourceSteps.ConnectInstanceStep;
    if (configure) return AddSourceSteps.ConfigureOauthStep;
    if (reAuthenticate) return AddSourceSteps.ReAuthenticateStep;
    return AddSourceSteps.ConfigIntroStep;
  };

  const [addSourceCurrentStep, setAddSourceStep] = useState(getFirstStep());

  if (dataLoading) return <Loading />;

  const goToConfigurationIntro = () => setAddSourceStep(AddSourceSteps.ConfigIntroStep);
  const goToSaveConfig = () => setAddSourceStep(AddSourceSteps.SaveConfigStep);
  const setConfigCompletedStep = () => setAddSourceStep(AddSourceSteps.ConfigCompletedStep);
  const goToConfigCompleted = () => saveSourceConfig(false, setConfigCompletedStep);

  const goToConnectInstance = () => {
    setAddSourceStep(AddSourceSteps.ConnectInstanceStep);
    KibanaLogic.values.navigateToUrl(`${getSourcesPath(addPath, isOrganization)}/connect`);
  };

  const saveCustomSuccess = () => setAddSourceStep(AddSourceSteps.SaveCustomStep);
  const goToSaveCustom = () => createContentSource(CUSTOM_SERVICE_TYPE, saveCustomSuccess);

  const goToFormSourceCreated = (sourceName: string) => {
    KibanaLogic.values.navigateToUrl(
      `${getSourcesPath(SOURCE_ADDED_PATH, isOrganization)}/?name=${sourceName}`
    );
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
      {addSourceCurrentStep === AddSourceSteps.ReAuthenticateStep && (
        <ReAuthenticate name={name} header={header} />
      )}
    </>
  );
};
