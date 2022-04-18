/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FormEvent } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiSteps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { AppLogic } from '../../../../../app_logic';
import {
  PersonalDashboardLayout,
  WorkplaceSearchPageTemplate,
} from '../../../../../components/layout';
import { NAV, REMOVE_BUTTON } from '../../../../../constants';
import { SourceDataItem } from '../../../../../types';

import { staticExternalSourceData } from '../../../source_data';

import { AddSourceHeader } from '../add_source_header';
import { ConfigDocsLinks } from '../config_docs_links';
import { OAUTH_SAVE_CONFIG_BUTTON, OAUTH_BACK_BUTTON } from '../constants';

import { ExternalConnectorDocumentation } from './external_connector_documentation';
import { ExternalConnectorFormFields } from './external_connector_form_fields';
import { ExternalConnectorLogic } from './external_connector_logic';

interface SaveConfigProps {
  sourceData: SourceDataItem;
  goBack?: () => void;
  onDeleteConfig?: () => void;
}

export const ExternalConnectorConfig: React.FC<SaveConfigProps> = ({
  sourceData,
  goBack,
  onDeleteConfig,
}) => {
  const serviceType = 'external';
  const { saveExternalConnectorConfig } = useActions(ExternalConnectorLogic);

  const {
    formDisabled,
    buttonLoading,
    externalConnectorUrl,
    externalConnectorApiKey,
    sourceConfigData,
    urlValid,
  } = useValues(ExternalConnectorLogic);

  const handleFormSubmission = (e: FormEvent) => {
    e.preventDefault();
    saveExternalConnectorConfig({ url: externalConnectorUrl, apiKey: externalConnectorApiKey });
  };

  const { name, categories } = sourceConfigData;
  const {
    configuration: { applicationLinkTitle, applicationPortalUrl },
  } = sourceData;
  const { isOrganization } = useValues(AppLogic);

  const {
    configuration: { documentationUrl },
  } = staticExternalSourceData;

  const saveButton = (
    <EuiButton color="primary" fill isLoading={buttonLoading} disabled={formDisabled} type="submit">
      {OAUTH_SAVE_CONFIG_BUTTON}
    </EuiButton>
  );

  const deleteButton = (
    <EuiButton color="danger" fill disabled={buttonLoading} onClick={onDeleteConfig}>
      {REMOVE_BUTTON}
    </EuiButton>
  );

  const backButton = <EuiButtonEmpty onClick={goBack}>{OAUTH_BACK_BUTTON}</EuiButtonEmpty>;

  const formActions = (
    <EuiFormRow>
      <EuiFlexGroup justifyContent="flexStart" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>{saveButton}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          {goBack && backButton}
          {onDeleteConfig && deleteButton}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );

  const connectorForm = (
    <EuiFlexGroup justifyContent="flexStart" direction="column" responsive={false}>
      <ConfigDocsLinks
        name={name}
        documentationUrl={documentationUrl}
        applicationPortalUrl={applicationPortalUrl}
        applicationLinkTitle={applicationLinkTitle}
      />
      <EuiSpacer />
      <EuiForm isInvalid={!urlValid}>
        <ExternalConnectorFormFields />
        <EuiSpacer />
        {formActions}
      </EuiForm>
    </EuiFlexGroup>
  );

  const configSteps = [
    {
      title: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.contentSource.addSource.externalConnectorConfig.stepTitle',
        {
          defaultMessage: 'Provide the appropriate configuration information',
        }
      ),
      children: connectorForm,
    },
  ];

  const header = <AddSourceHeader name={name} serviceType={serviceType} categories={categories} />;
  const Layout = isOrganization ? WorkplaceSearchPageTemplate : PersonalDashboardLayout;

  return (
    <Layout pageChrome={[NAV.SOURCES, NAV.ADD_SOURCE, name || '...']} isLoading={false}>
      {header}
      <EuiSpacer size="l" />
      <ExternalConnectorDocumentation name={name} documentationUrl={documentationUrl} />
      <EuiSpacer size="l" />
      <form onSubmit={handleFormSubmission}>
        <EuiSteps steps={configSteps} />
      </form>
    </Layout>
  );
};
