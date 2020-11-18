/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';

import { History } from 'history';
import { useActions, useValues } from 'kea';
import { useHistory } from 'react-router-dom';

import { AppLogic } from 'workplace_search/App/AppLogic';
import { Loading } from 'workplace_search/components';
import { CUSTOM_SERVICE_TYPE } from 'workplace_search/constants';
import { staticSourceData } from 'workplace_search/ContentSources/sourceData';
import { SourceLogic } from 'workplace_search/ContentSources/SourceLogic';
import { SourceDataItem, FeatureIds } from 'workplace_search/types';
import {
  ADD_SOURCE_PATH,
  SOURCE_ADDED_PATH,
  getSourcesPath,
} from 'workplace_search/utils/routePaths';

import { AddSourceHeader } from './AddSourceHeader';
import { ConfigCompleted } from './ConfigCompleted';
import { ConfigurationIntro } from './ConfigurationIntro';
import { ConfigureCustom } from './ConfigureCustom';
import { ConfigureOauth } from './ConfigureOauth';
import { ConnectInstance } from './ConnectInstance';
import { ReAuthenticate } from './ReAuthenticate';
import { SaveConfig } from './SaveConfig';
import { SaveCustom } from './SaveCustom';

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

  const breadcrumbs = {
    topLevelPath: getSourcesPath(ADD_SOURCE_PATH, isOrganization),
    topLevelName: '← Back to sources',
  };

  const isCustom = serviceType === CUSTOM_SERVICE_TYPE;
  const isRemote = features?.platinumPrivateContext.includes(FeatureIds.Remote);

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

  const goToFormSourceCreated = (sourceName) => {
    history.push(`${getSourcesPath(SOURCE_ADDED_PATH, isOrganization)}/?name=${sourceName}`);
  };

  const sidebarTitle = () => {
    if (currentStep === Steps.ConnectInstanceStep || currentStep === Steps.ConfigureOauthStep) {
      return 'Connect';
    }
    if (currentStep === Steps.ReAuthenticateStep) {
      return 'Re-authenticate';
    }
    if (currentStep === Steps.ConfigureCustomStep || currentStep === Steps.SaveCustomStep) {
      return 'Create a';
    }
    return 'Configure';
  };

  const CREATE_CUSTOM_SOURCE_SIDEBAR_BLURB =
    'Custom API Sources provide a set of feature-rich endpoints for indexing data from any content repository.';
  const CONFIGURE_ORGANIZATION_SOURCE_SIDEBAR_BLURB =
    'Follow the configuration flow to add a new content source to Workplace Search. First, create an OAuth application in the content source. After that, connect as many instances of the content source that you need.';
  const CONFIGURE_PRIVATE_SOURCE_SIDEBAR_BLURB =
    'Follow the configuration flow to add a new private content source to Workplace Search. Private content sources are added by each person via their own personal dashboards. Their data stays safe and visible only to them.';
  const CONNECT_ORGANIZATION_SOURCE_SIDEBAR_BLURB = `Upon successfully connecting ${name}, source content will be synced to your organization and will be made available and searchable.`;
  const CONNECT_PRIVATE_REMOTE_SOURCE_SIDEBAR_BLURB = (
    <>
      {name} is a <strong>remote source</strong>, which means that each time you search, we reach
      out to the content source and get matching results directly from {name}&apos;s servers.
    </>
  );
  const CONNECT_PRIVATE_STANDARD_SOURCE_SIDEBAR_BLURB = (
    <>
      {name} is a <strong>standard source</strong> for which content is synchronized on a regular
      basis, in a relevant and secure way.
    </>
  );

  const CONNECT_PRIVATE_SOURCE_SIDEBAR_BLURB = isRemote
    ? CONNECT_PRIVATE_REMOTE_SOURCE_SIDEBAR_BLURB
    : CONNECT_PRIVATE_STANDARD_SOURCE_SIDEBAR_BLURB;
  const CONFIGURE_SOURCE_SIDEBAR_BLURB = accountContextOnly
    ? CONFIGURE_PRIVATE_SOURCE_SIDEBAR_BLURB
    : CONFIGURE_ORGANIZATION_SOURCE_SIDEBAR_BLURB;

  const CONFIG_SIDEBAR_BLURB = isCustom
    ? CREATE_CUSTOM_SOURCE_SIDEBAR_BLURB
    : CONFIGURE_SOURCE_SIDEBAR_BLURB;
  const CONNECT_SIDEBAR_BLURB = isOrganization
    ? CONNECT_ORGANIZATION_SOURCE_SIDEBAR_BLURB
    : CONNECT_PRIVATE_SOURCE_SIDEBAR_BLURB;

  const sidebarBlurb =
    currentStep === Steps.ConnectInstanceStep ? CONNECT_SIDEBAR_BLURB : CONFIG_SIDEBAR_BLURB;

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
