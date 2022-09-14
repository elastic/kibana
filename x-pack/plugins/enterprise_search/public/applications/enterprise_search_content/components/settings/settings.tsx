/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';
import { PipelineSettingsForm } from '../shared/pipeline_settings/pipeline_settings_form';

import { SettingsLogic } from './settings_logic';

export const Settings: React.FC = () => {
  const { makeRequest, setPipeline } = useActions(SettingsLogic);
  const { defaultPipeline, isLoading, pipelineState } = useValues(SettingsLogic);
  return (
    <EnterpriseSearchContentPageTemplate
      pageChrome={[
        i18n.translate('xpack.enterpriseSearch.content.searchIndices.content.breadcrumb', {
          defaultMessage: 'Content',
        }),
        i18n.translate('xpack.enterpriseSearch.content.settings.breadcrumb', {
          defaultMessage: 'Settings',
        }),
      ]}
      pageHeader={{
        pageTitle: i18n.translate('xpack.enterpriseSearch.content.settings.headerTitle', {
          defaultMessage: 'Content Settings',
        }),
        rightSideItems: [
          <EuiButton fill isLoading={isLoading} onClick={() => makeRequest(pipelineState)}>
            {i18n.translate('xpack.enterpriseSearch.content.settings.saveButtonLabel', {
              defaultMessage: 'Save',
            })}
          </EuiButton>,
          <EuiButton isLoading={isLoading} onClick={() => setPipeline(defaultPipeline)}>
            {i18n.translate('xpack.enterpriseSearch.content.settings.resetButtonLabel', {
              defaultMessage: 'Reset',
            })}
          </EuiButton>,
        ],
      }}
      pageViewTelemetry="Settings"
      isLoading={false}
    >
      <EuiPanel hasBorder>
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <EuiText size="m">
              <h4>
                <strong>
                  {i18n.translate('xpack.enterpriseSearch.content.settings.deploymentHeaderTitle', {
                    defaultMessage: 'Deployment wide content extraction',
                  })}
                </strong>
              </h4>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              {i18n.translate('xpack.enterpriseSearch.content.settings.descriptionOne', {
                defaultMessage:
                  'Content extraction for your Enterprise Search deployment allows ingestion mechanisms to extract searchable content from PDFs, and other Word document types. This setting affects all newly created Elasticsearch indices with an associated Enterprise Search ingestion mechanism.',
              })}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              {i18n.translate('xpack.enterpriseSearch.content.settings.descriptionOne', {
                defaultMessage:
                  'Each index can be changed individually to enable or disable this feature on their respective configuration pages.',
              })}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <PipelineSettingsForm pipeline={pipelineState} setPipeline={setPipeline} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EnterpriseSearchContentPageTemplate>
  );
};
