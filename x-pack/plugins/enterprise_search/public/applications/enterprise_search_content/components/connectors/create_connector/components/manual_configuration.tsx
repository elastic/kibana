/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';

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

import { KibanaDeps } from '../../../../../../../common/types';

import { AttachIndexBox } from '../../../connector_detail/attach_index_box';
import { ConnectorViewValues } from '../../../connector_detail/connector_view_logic';

export interface ManualConfigurationProps {
  connector: ConnectorViewValues;
  connectorName: string;
  isDisabled: boolean;
  setConnectorName: Function;
  setIsNextStepEnabled: Function;
}

export const ManualConfiguration: React.FC<ManualConfigurationProps> = ({
  isDisabled,
  connectorName,
  setConnectorName,
  connector,
  setIsNextStepEnabled,
}) => {
  const { services } = useKibana<KibanaDeps>();
  const [isPopoverOpen, setPopover] = useState(false);
  const splitButtonPopoverId = useGeneratedHtmlId({
    prefix: 'splitButtonPopover',
  });
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
  const cliCode = `./bin/connectors connector create \  
--index-name my-index \    
--index-language en \  
--from-file config.yml
`;

  const flyoutCliContent: React.FC = () => (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={simpleFlyoutTitleId}>
            {i18n.translate('xpack.enterpriseSearch.manualConfiguration.h2.cliLabel', {
              defaultMessage: 'CLI',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText size="s">
          <p>
            {i18n.translate('xpack.enterpriseSearch.manualConfiguration.p.youCanAlsoUseLabel', {
              defaultMessage: 'You can also use the',
            })}{' '}
            <EuiLink
              data-test-subj="enterpriseSearchManualConfigurationConnectorsCliLink"
              href="https://github.com/elastic/connectors/blob/main/docs/CLI.md"
              target="_blank"
              external
            >
              {i18n.translate('xpack.enterpriseSearch.manualConfiguration.connectorsCLILinkLabel', {
                defaultMessage: 'connectors CLI',
              })}
            </EuiLink>{' '}
            {i18n.translate(
              'xpack.enterpriseSearch.manualConfiguration.p.commandlineInterfaceTheFollowingLabel',
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
  );
  const flyoutManualConfigContent: React.FC = () => (
    <>
      {' '}
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={simpleFlyoutTitleId}>
            {i18n.translate('xpack.enterpriseSearch.manualConfiguration.h2.cliLabel', {
              defaultMessage: 'Manual configuration',
            })}
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText color="subdued" size="s">
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.flyoutManualConfigContent.p.thisManualOptionIsLabel',
              { defaultMessage: 'This manual option is an alternative to the' }
            )}
            <b>
              {' '}
              {i18n.translate(
                'xpack.enterpriseSearch.flyoutManualConfigContent.p.thisManualOptionIsLabel',
                { defaultMessage: 'Generate configuration' }
              )}
            </b>{' '}
            {i18n.translate(
              'xpack.enterpriseSearch.flyoutManualConfigContent.p.optionWhichCreatesALabel',
              { defaultMessage: 'option which creates a new index and API key automatically.' }
            )}
          </p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexItem>
          <EuiPanel hasBorder>
            <EuiTitle size="s">
              <h3>
                {i18n.translate('xpack.enterpriseSearch.manualConfiguration.connectorName', {
                  defaultMessage: 'Connector',
                })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiFormRow
              fullWidth
              label={i18n.translate(
                'xpack.enterpriseSearch.startStep.euiFormRow.connectorNameLabel',
                { defaultMessage: 'Connector name' }
              )}
              helpText="Names should be lowercase and cannot contain spaces or special characters."
            >
              <EuiFieldText
                data-test-subj="enterpriseSearchStartStepFieldText"
                fullWidth
                name="first"
                value={connectorName}
                onChange={(e) => {
                  if (e.target.value !== connectorName) {
                    setConnectorName(e.target.value);
                  }
                }}
              />
            </EuiFormRow>
          </EuiPanel>
        </EuiFlexItem>
        <EuiSpacer size="m" />
        <EuiFlexItem>
          <AttachIndexBox connector={connector} />
        </EuiFlexItem>
        <EuiSpacer size="m" />
        <EuiFlexItem>
          <EuiPanel hasBorder>
            <EuiTitle size="s">
              <h3>
                {i18n.translate('xpack.enterpriseSearch.manualConfiguration.connectorName', {
                  defaultMessage: 'Bring your API key',
                })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiFormRow
              fullWidth
              helpText={i18n.translate(
                'xpack.enterpriseSearch.startStep.euiFormRow.connectorNameLabel',
                { defaultMessage: 'If no API key is provided, one will be generated for you.' }
              )}
              label={i18n.translate(
                'xpack.enterpriseSearch.startStep.euiFormRow.connectorNameLabel',
                { defaultMessage: 'API key name' }
              )}
            >
              <EuiFieldText
                data-test-subj="enterpriseSearchStartStepFieldText"
                fullWidth
                name="first"
                placeholder="Your encoded API key"
                value={''}
                onChange={() => {}}
              />
            </EuiFormRow>
            <EuiSpacer size="s" />
            <EuiLink
              data-test-subj="enterpriseSearchFlyoutManualConfigContentCreateAnApiKeyLink"
              href="https://www.elastic.co/guide/en/cloud/current/ec-api-keys.html"
              target="_blank"
              external
            >
              {i18n.translate('xpack.enterpriseSearch.manualConfiguration.createAPIKey', {
                defaultMessage: 'Manage API key',
              })}
            </EuiLink>
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
                'xpack.enterpriseSearch.flyoutManualConfigContent.closeButtonEmptyLabel',
                { defaultMessage: 'Close' }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="enterpriseSearchFlyoutManualConfigContentSaveButton"
              onClick={() => {
                setIsFlyoutVisible(false);
                setIsNextStepEnabled(true);
                setTimeout(() => {
                  window.scrollTo({
                    behavior: 'smooth',
                    top: window.innerHeight,
                  });
                }, 100);
              }}
              fill
            >
              {i18n.translate(
                'xpack.enterpriseSearch.flyoutManualConfigContent.saveConfigurationButtonLabel',
                { defaultMessage: 'Save configuration' }
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
  const [flyoutConten, setFlyoutConten] = useState<React.FC>(flyoutManualConfigContent);
  const items = [
    <EuiContextMenuItem
      key="copy"
      icon="wrench"
      onClick={() => {
        setFlyoutConten(flyoutManualConfigContent);
        setIsFlyoutVisible(true);
        closePopover();
      }}
    >
      {i18n.translate(
        'xpack.enterpriseSearch.finishUpStep.manageAttachedIndexContextMenuItemLabel',
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
        content={i18n.translate('searchApiPanels.welcomeBanner.selectClient.callout.link', {
          defaultMessage: `Try in Console`,
        })}
        request={`#Create an index
PUT /my-index-000001
{
  "settings": {
    "index": {
      "number_of_shards": 3,  
      "number_of_replicas": 2 
    }
  }
}

# Create an API key
POST /_security/api_key
{   
  "name": "my-api-key",   
  "expiration": "1d",      
  "role_descriptors": 
    {
       "role-a": {       
          "cluster": ["all"],
            "indices": [
                          {           
                            "names": ["index-a*"],
                             "privileges": ["read"]
                          }       
                        ]     
                          }, 
                            "role-b": {  
                            "cluster": ["all"],       
                            "indices": [ 
                              { 
                                "names": ["index-b*"],
                                  "privileges": ["all"]
                              }]     
                            }   
                          }, "metadata": 
                          {  "application": "my-application",     
                             "environment": { 
                              "level": 1,        
                              "trusted": true,        
                              "tags": ["dev", "staging"]     
                          }  
      }
  }`}
      />
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="share"
      icon="console"
      onClick={() => {
        setFlyoutConten(flyoutCliContent);
        setIsFlyoutVisible(true);
        closePopover();
      }}
    >
      {i18n.translate('xpack.enterpriseSearch.finishUpStep.scheduleASyncContextMenuItemLabel', {
        defaultMessage: 'Try with CLI',
      })}
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
              'xpack.enterpriseSearch.finishUpStep.euiButtonIcon.moreLabel',
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
          {flyoutConten}
        </EuiFlyout>
      )}
    </>
  );
};
