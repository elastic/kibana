/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCode,
  EuiCodeBlock,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { CREATE_CONNECTOR_PLUGIN } from '../../../../../../../common/constants';
import { NewConnectorLogic } from '../../../new_index/method_connector/new_connector_logic';

import { SelfManagePreference } from '../create_connector';

const CLI_LABEL = i18n.translate(
  'xpack.enterpriseSearch.createConnector.manualConfiguration.cliLabel',
  {
    defaultMessage: 'CLI',
  }
);

export interface ManualConfigurationFlyoutProps {
  flyoutContent: string | undefined;
  selfManagePreference: SelfManagePreference;
  setIsFlyoutVisible: (value: boolean) => void;
}
export const ManualConfigurationFlyout: React.FC<ManualConfigurationFlyoutProps> = ({
  flyoutContent,
  selfManagePreference,
  setIsFlyoutVisible,
}) => {
  const simpleFlyoutTitleId = useGeneratedHtmlId({
    prefix: 'simpleFlyoutTitle',
  });

  const { connectorName } = useValues(NewConnectorLogic);
  const { setRawName, createConnector } = useActions(NewConnectorLogic);

  return (
    <EuiFlyout
      ownFocus
      onClose={() => setIsFlyoutVisible(false)}
      aria-labelledby={simpleFlyoutTitleId}
      size="s"
    >
      {flyoutContent === 'manual_config' && (
        <>
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2 id={simpleFlyoutTitleId}>
                {i18n.translate(
                  'xpack.enterpriseSearch.createConnector.manualConfiguration.h2.cliLabel',
                  {
                    defaultMessage: 'Manual configuration',
                  }
                )}
              </h2>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText color="subdued" size="s">
              <p>
                <FormattedMessage
                  id="xpack.enterpriseSearch.createConnector.flyoutManualConfigContent.p.thisManualOptionIsLabel"
                  defaultMessage="This manual option is an alternative to the {generateConfig} option, here you can bring your already existing index or API key."
                  values={{
                    generateConfig: (
                      <b>
                        {i18n.translate(
                          'xpack.enterpriseSearch.createConnector.manualConfiguration.generateConfigLinkLabel',
                          {
                            defaultMessage: 'Generate configuration',
                          }
                        )}
                      </b>
                    ),
                  }}
                />
              </p>
            </EuiText>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiFlexItem>
              <EuiPanel hasBorder>
                <EuiTitle size="s">
                  <h3>
                    {i18n.translate(
                      'xpack.enterpriseSearch.createConnector.manualConfiguration.connectorName',
                      {
                        defaultMessage: 'Connector',
                      }
                    )}
                  </h3>
                </EuiTitle>
                <EuiSpacer size="m" />
                <EuiFormRow
                  fullWidth
                  label={i18n.translate(
                    'xpack.enterpriseSearch.createConnector.startStep.euiFormRow.connectorNameLabel',
                    { defaultMessage: 'Connector name' }
                  )}
                >
                  <EuiFieldText
                    data-test-subj="enterpriseSearchStartStepFieldText"
                    fullWidth
                    name="first"
                    value={connectorName}
                    onChange={(e) => {
                      setRawName(e.target.value);
                    }}
                  />
                </EuiFormRow>
                <EuiSpacer size="m" />
                <EuiText size="xs">
                  <p>
                    {i18n.translate(
                      'xpack.enterpriseSearch.createConnector.manualConfiguration.p.connectorNameDescription',
                      {
                        defaultMessage:
                          'You will be redirected to the connector page to configure the rest of your connector',
                      }
                    )}
                  </p>
                </EuiText>
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="enterpriseSearchFlyoutManualConfigContentCloseButton"
                  iconType="cross"
                  onClick={() => setIsFlyoutVisible(false)}
                  flush="left"
                >
                  {i18n.translate(
                    'xpack.enterpriseSearch.createConnector.flyoutManualConfigContent.closeButtonEmptyLabel',
                    { defaultMessage: 'Close' }
                  )}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="enterpriseSearchFlyoutManualConfigContentSaveButton"
                  onClick={() => {
                    createConnector({
                      isSelfManaged: selfManagePreference === 'selfManaged',
                      shouldGenerateAfterCreate: false,
                      shouldNavigateToConnectorAfterCreate: true,
                    });
                  }}
                  fill
                >
                  {i18n.translate(
                    'xpack.enterpriseSearch.createConnector.flyoutManualConfigContent.saveConfigurationButtonLabel',
                    { defaultMessage: 'Save configuration' }
                  )}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </>
      )}
      {flyoutContent === 'client' && (
        <>
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2 id={simpleFlyoutTitleId}>{CLI_LABEL}</h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="xpack.enterpriseSearch.createConnector.manualConfiguration.p.youCanAlsoUseLabel"
                  defaultMessage="You can also use the connectors {cliLink}. The following command creates a new connector attached to the {myIndex}, using configuration from your file."
                  values={{
                    cliLink: (
                      <EuiLink
                        data-test-subj="enterpriseSearchManualConfigurationConnectorsCliLink"
                        href="https://github.com/elastic/connectors/blob/main/docs/CLI.md"
                        target="_blank"
                        external
                      >
                        {CLI_LABEL}
                      </EuiLink>
                    ),
                    myIndex: <EuiCode>my-index</EuiCode>,
                  }}
                />
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiCodeBlock language="bash" isCopyable>
              {CREATE_CONNECTOR_PLUGIN.CLI_SNIPPET}
            </EuiCodeBlock>
          </EuiFlyoutBody>
        </>
      )}
    </EuiFlyout>
  );
};
