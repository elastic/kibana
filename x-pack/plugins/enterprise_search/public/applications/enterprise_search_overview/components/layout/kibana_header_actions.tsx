/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import {
  EuiHeaderLinks,
  EuiIcon,
  EuiCopy,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiPopover,
  EuiFormRow,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiPopoverTitle,
  EuiPopoverFooter,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

export const EnterpriseSearchOverviewHeaderActions: React.FC = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  // TODO change it with actual value
  const clientId = 'fgdshjafghj13eshfdjag718yfhjdskf';

  return (
    <EuiHeaderLinks>
      <EuiPopover
        button={
          <EuiButtonEmpty onClick={() => setIsPopoverOpen(!isPopoverOpen)}>
            <EuiIcon type="iInCircle" />
            &nbsp;
            {i18n.translate('xpack.enterpriseSearch.overview.deploymentDetails', {
              defaultMessage: 'Deployment details',
            })}
          </EuiButtonEmpty>
        }
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
      >
        <EuiPopoverTitle>
          {i18n.translate('xpack.enterpriseSearch.overview.deploymentDetails', {
            defaultMessage: 'Deployment details',
          })}
        </EuiPopoverTitle>
        <EuiText grow={false}>
          <p>
            {i18n.translate('xpack.enterpriseSearch.overview.deploymentDetails.description', {
              defaultMessage:
                'Send data to Elastic from your applications by referencing your deployment and Elasticsearch information.',
            })}
          </p>
        </EuiText>
        <EuiSpacer />
        <EuiFormRow
          fullWidth
          label={i18n.translate('xpack.enterpriseSearch.overview.deploymentDetails.clientIdLabel', {
            defaultMessage: 'Client ID',
          })}
        >
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow>
              <EuiFieldText readOnly value={clientId} fullWidth />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiCopy
                beforeMessage={i18n.translate(
                  'xpack.enterpriseSearch.overview.deploymentDetails.copyToClipboard',
                  { defaultMessage: 'Copy to clipboard' }
                )}
                afterMessage={i18n.translate(
                  'xpack.enterpriseSearch.overview.deploymentDetails.copiedToClipboard',
                  { defaultMessage: 'Copied Client ID to clipboard' }
                )}
                textToCopy={clientId}
              >
                {(copy) => (
                  <EuiButtonIcon
                    aria-label={i18n.translate(
                      'xpack.enterpriseSearch.overview.deploymentDetails.copyButtonAriaLabel',
                      { defaultMessage: 'Copy to clipboard' }
                    )}
                    onClick={copy}
                    iconType="copyClipboard"
                    color="primary"
                    display="base"
                    size="s"
                  />
                )}
              </EuiCopy>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
        <EuiPopoverFooter>
          {/* TODO need link to Create and manage API keys*/}
          <EuiButton>
            {i18n.translate('xpack.enterpriseSearch.overview.createAndManageButton', {
              defaultMessage: 'Create and manage API keys',
            })}
          </EuiButton>
        </EuiPopoverFooter>
      </EuiPopover>
    </EuiHeaderLinks>
  );
};
