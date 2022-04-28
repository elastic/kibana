/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useParams } from 'react-router-dom';

import { useActions, useValues } from 'kea';

import { i18n } from '@kbn/i18n';

import { flashSuccessToast } from '../../../../../shared/flash_messages';
import { KibanaLogic } from '../../../../../shared/kibana';
import { LicensingLogic } from '../../../../../shared/licensing';

import { AppLogic } from '../../../../app_logic';
import {
  WorkplaceSearchPageTemplate,
  PersonalDashboardLayout,
} from '../../../../components/layout';
import { NAV } from '../../../../constants';
import { SOURCES_PATH, getSourcesPath, getAddPath, ADD_SOURCE_PATH } from '../../../../routes';

import { getSourceData } from '../../source_data';

import { AddSourceHeader } from './add_source_header';
import { AddSourceLogic, AddSourceSteps } from './add_source_logic';
import { ConfigCompleted } from './config_completed';
import { ConfigureOauth } from './configure_oauth';
import { ConnectInstance } from './connect_instance';
import { Reauthenticate } from './reauthenticate';
import { SaveConfig } from './save_config';

import './add_source.scss';

export const AddSource: React.FC = () => {
  const { serviceType, initialStep } = useParams<{ serviceType: string; initialStep: string }>();
  const addSourceLogic = AddSourceLogic({ serviceType, initialStep });
  const { getSourceConfigData, setAddSourceStep, saveSourceConfig, resetSourceState } =
    useActions(addSourceLogic);
  const { addSourceCurrentStep, sourceConfigData, dataLoading } = useValues(addSourceLogic);
  const { isOrganization } = useValues(AppLogic);
  const { hasPlatinumLicense } = useValues(LicensingLogic);
  const { navigateToUrl } = useValues(KibanaLogic);

  const sourceData = getSourceData(serviceType);

  useEffect(() => {
    getSourceConfigData();
    return resetSourceState;
  }, [serviceType]);

  const { name, categories, accountContextOnly } = sourceConfigData;

  if (!sourceData) {
    return null;
  }

  if (!hasPlatinumLicense && accountContextOnly) {
    navigateToUrl(getSourcesPath(ADD_SOURCE_PATH, isOrganization));
  }

  const { configuration, features, objTypes } = sourceData;

  const goToConfigurationIntro = () =>
    KibanaLogic.values.navigateToUrl(
      `${getSourcesPath(getAddPath(serviceType), isOrganization)}/intro`
    );
  const setConfigCompletedStep = () => setAddSourceStep(AddSourceSteps.ConfigCompletedStep);
  const goToConfigCompleted = () => saveSourceConfig(false, setConfigCompletedStep);
  const goToConnectInstance = () => setAddSourceStep(AddSourceSteps.ConnectInstanceStep);
  const FORM_SOURCE_ADDED_SUCCESS_MESSAGE = i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.contentSource.formSourceAddedSuccessMessage',
    {
      defaultMessage: '{name} connected',
      values: { name },
    }
  );

  const goToFormSourceCreated = () => {
    KibanaLogic.values.navigateToUrl(`${getSourcesPath(SOURCES_PATH, isOrganization)}`);
    flashSuccessToast(FORM_SOURCE_ADDED_SUCCESS_MESSAGE);
  };

  const header = <AddSourceHeader name={name} serviceType={serviceType} categories={categories} />;
  const Layout = isOrganization ? WorkplaceSearchPageTemplate : PersonalDashboardLayout;

  return (
    <Layout pageChrome={[NAV.SOURCES, NAV.ADD_SOURCE, name || '...']} isLoading={dataLoading}>
      {addSourceCurrentStep === AddSourceSteps.SaveConfigStep && (
        <SaveConfig
          configuration={configuration}
          advanceStep={goToConfigCompleted}
          goBackStep={goToConfigurationIntro}
          header={header}
        />
      )}
      {addSourceCurrentStep === AddSourceSteps.ConfigCompletedStep && (
        <ConfigCompleted advanceStep={goToConnectInstance} header={header} />
      )}
      {addSourceCurrentStep === AddSourceSteps.ConnectInstanceStep && (
        <ConnectInstance
          configuration={configuration}
          features={features}
          objTypes={objTypes}
          onFormCreated={goToFormSourceCreated}
          header={header}
        />
      )}
      {addSourceCurrentStep === AddSourceSteps.ConfigureOauthStep && (
        <ConfigureOauth onFormCreated={goToFormSourceCreated} header={header} />
      )}
      {addSourceCurrentStep === AddSourceSteps.ReauthenticateStep && (
        <Reauthenticate header={header} />
      )}
    </Layout>
  );
};
