/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiButtonIcon,
  EuiCode,
  EuiCodeBlock,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFieldText,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiFormRow,
  EuiLink,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
  EuiFlexGroup,
  EuiButtonEmpty,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import { TryInConsoleButton } from '@kbn/try-in-console';

import { CREATE_CONNECTOR_PLUGIN } from '../../../../../../../common/constants';
import { KibanaDeps } from '../../../../../../../common/types';

import { NewConnectorLogic } from '../../../new_index/method_connector/new_connector_logic';
import { SelfManagePreference } from '../create_connector';

export interface ManualConfigurationProps {
  isDisabled: boolean;
  selfManagePreference: SelfManagePreference;
}

export const ManualConfiguration: React.FC<ManualConfigurationProps> = ({
  isDisabled,
  selfManagePreference,
}) => {
  const { services } = useKibana<KibanaDeps>();
  const [isPopoverOpen, setPopover] = useState(false);
  const splitButtonPopoverId = useGeneratedHtmlId({
    prefix: 'splitButtonPopover',
  });
  const { connectorName } = useValues(NewConnectorLogic);
  const { setRawName, createConnector } = useActions(NewConnectorLogic);
  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const simpleFlyoutTitleId = useGeneratedHtmlId({
    prefix: 'simpleFlyoutTitle',
  });
  const [flyoutContent, setFlyoutContent] = useState<'manual_config' | 'client'>();
  const cliCode = CREATE_CONNECTOR_PLUGIN.CLI_SNIPPET;

  const items = [
    <EuiContextMenuItem
      key="copy"
      icon="wrench"
      onClick={() => {
        setFlyoutContent('manual_config');
        setIsFlyoutVisible(true);
        closePopover();
      }}
    >
      {i18n.translate(
        'xpack.enterpriseSearch.createConnector.finishUpStep.manageAttachedIndexContextMenuItemLabel',
        { defaultMessage: 'Manual configuration' }
      )}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="edit"
      onClick={() => {
        closePopover();
      }}
    >
      <TryInConsoleButton
        application={services.application}
        sharePlugin={services.share}
        consolePlugin={services.console}
        content={i18n.translate(
          'xpack.enterpriseSearch.createConnector.flyoutManualConfigContent.TryInConsoleLabel',
          {
            defaultMessage: `Try in Console`,
          }
        )}
        request={CREATE_CONNECTOR_PLUGIN.CONSOLE_SNIPPET}
      />
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="share"
      icon="console"
      onClick={() => {
        setFlyoutContent('client');
        setIsFlyoutVisible(true);
        closePopover();
      }}
    >
      {i18n.translate(
        'xpack.enterpriseSearch.createConnector.finishUpStep.scheduleASyncContextMenuItemLabel',
        {
          defaultMessage: 'Try with CLI',
        }
      )}
    </EuiContextMenuItem>,
  ];

  return (
    <>
      <EuiPopover
        id={splitButtonPopoverId}
        button={
          <EuiButtonIcon
            data-test-subj="enterpriseSearchFinishUpStepButton"
            display="fill"
            disabled={isDisabled}
            size="m"
            iconType="boxesVertical"
            aria-label={i18n.translate(
              'xpack.enterpriseSearch.createConnector.finishUpStep.euiButtonIcon.moreLabel',
              { defaultMessage: 'More' }
            )}
            onClick={onButtonClick}
          />
        }
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenuPanel items={items} />
      </EuiPopover>
      {isFlyoutVisible && (
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
                    {i18n.translate(
                      'xpack.enterpriseSearch.createConnector.flyoutManualConfigContent.p.thisManualOptionIsLabel',
                      { defaultMessage: 'This manual option is an alternative to the' }
                    )}
                    <b>
                      {' '}
                      {i18n.translate(
                        'xpack.enterpriseSearch.createConnector.flyoutManualConfigContent.p.thisManualOptionIsLabel',
                        { defaultMessage: 'Generate configuration' }
                      )}
                    </b>{' '}
                    {i18n.translate(
                      'xpack.enterpriseSearch.createConnector.flyoutManualConfigContent.p.optionWhichCreatesALabel',
                      {
                        defaultMessage:
                          'option, here you can bring your already existing index or API key.',
                      }
                    )}
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
                              'You will be redirected to connector page to configure the rest of your connector',
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
                  <h2 id={simpleFlyoutTitleId}>
                    {i18n.translate(
                      'xpack.enterpriseSearch.createConnector.manualConfiguration.h2.cliLabel',
                      {
                        defaultMessage: 'CLI',
                      }
                    )}
                  </h2>
                </EuiTitle>
              </EuiFlyoutHeader>
              <EuiFlyoutBody>
                <EuiText size="s">
                  <p>
                    {i18n.translate(
                      'xpack.enterpriseSearch.createConnector.manualConfiguration.p.youCanAlsoUseLabel',
                      {
                        defaultMessage: 'You can also use the',
                      }
                    )}{' '}
                    <EuiLink
                      data-test-subj="enterpriseSearchManualConfigurationConnectorsCliLink"
                      href="https://github.com/elastic/connectors/blob/main/docs/CLI.md"
                      target="_blank"
                      external
                    >
                      {i18n.translate(
                        'xpack.enterpriseSearch.createConnector.manualConfiguration.connectorsCLILinkLabel',
                        {
                          defaultMessage: 'connectors CLI',
                        }
                      )}
                    </EuiLink>{' '}
                    {i18n.translate(
                      'xpack.enterpriseSearch.createConnector.manualConfiguration.p.commandlineInterfaceTheFollowingLabel',
                      {
                        defaultMessage:
                          'command-line interface. The following command creates a new connector attached to the',
                      }
                    )}{' '}
                    <EuiCode>my index</EuiCode>{' '}
                    {i18n.translate(
                      'xpack.enterpriseSearch.manualConfiguration.p.UsingConfigurationFromLabel',
                      { defaultMessage: ', using configuration from your file.' }
                    )}
                  </p>
                </EuiText>
                <EuiSpacer size="m" />
                <EuiCodeBlock language="bash" isCopyable>
                  {cliCode}
                </EuiCodeBlock>
              </EuiFlyoutBody>
            </>
          )}
        </EuiFlyout>
      )}
    </>
  );
};
