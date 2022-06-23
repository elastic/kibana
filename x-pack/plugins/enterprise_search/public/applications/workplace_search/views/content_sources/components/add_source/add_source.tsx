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
  const { serviceType, initialStep } = useParams<{ serviceType: string; initialStep?: string }>();
  const addSourceLogic = AddSourceLogic({ serviceType, initialStep });
  const { getSourceConfigData, setAddSourceStep, saveSourceConfig, resetSourceState } =
    useActions(addSourceLogic);
  const { addSourceCurrentStep, sourceConfigData, dataLoading } = useValues(addSourceLogic);
  const { isOrganization } = useValues(AppLogic);
  const { hasPlatinumLicense } = useValues(LicensingLogic);
  const { navigateToUrl } = useValues(KibanaLogic);

  useEffect(() => {
    getSourceConfigData();
    return resetSourceState;
  }, [serviceType]);

  const sourceData = getSourceData(serviceType);

  if (!sourceData) {
    return null;
  }

  const { configuration, features, objTypes } = sourceData;

  const { name, categories, needsPermissions, accountContextOnly, privateSourcesEnabled } =
    sourceConfigData;

  if (!hasPlatinumLicense && accountContextOnly) {
    navigateToUrl(getSourcesPath(ADD_SOURCE_PATH, isOrganization));
  }

  const goToConfigurationIntro = () =>
    KibanaLogic.values.navigateToUrl(
      `${getSourcesPath(getAddPath(serviceType), isOrganization)}/intro`
    );
  const setConfigCompletedStep = () => setAddSourceStep(AddSourceSteps.ConfigCompletedStep);
  const goToConfigCompleted = () => saveSourceConfig(false, setConfigCompletedStep);
  const FORM_SOURCE_ADDED_SUCCESS_MESSAGE = i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.contentSource.formSourceAddedSuccessMessage',
    {
      defaultMessage: '{name} connected',
      values: { name },
    }
  );

  const goToConnectInstance = () => setAddSourceStep(AddSourceSteps.ConnectInstanceStep);
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
    </Layout>
  );
};
