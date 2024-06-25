/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export interface WhatsNextBoxProps {
  disabled?: boolean;
}

export const WhatsNextBox: React.FC<WhatsNextBoxProps> = ({ disabled = false }) => {
  return (
    <EuiPanel hasBorder>
      <EuiTitle size="s">
        <h3>
          {i18n.translate('xpack.enterpriseSearch.whatsNextBox.whatsNextPanelLabel', {
            defaultMessage: "What's next?",
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer />
      <EuiText>
        <p>
          {i18n.translate('xpack.enterpriseSearch.whatsNextBox.whatsNextPanelDescription', {
            defaultMessage:
              'You can manually sync your data, schedule a recurring sync or see your documents.',
          })}
        </p>
      </EuiText>
      <EuiSpacer />
      <EuiFlexGroup responsive={false} gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="enterpriseSearchWhatsNextBoxSearchPlaygroundButton"
            iconType="sparkles"
            disabled={disabled}
          >
            <FormattedMessage
              id="xpack.enterpriseSearch.whatsNextBox.searchPlaygroundButtonLabel"
              defaultMessage="Search Playground"
            />
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="enterpriseSearchWhatsNextBoxButton"
            iconType="eye"
            disabled={disabled}
          >
            <EuiFlexGroup responsive={false} gutterSize="xs">
              <EuiFlexItem grow={false}>
                {i18n.translate('xpack.enterpriseSearch.whatsNextBox.exploreDataFlexItemLabel', {
                  defaultMessage: 'Explore data',
                })}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIcon type="arrowDown" />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup responsive={false} gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiButton
                disabled={disabled}
                data-test-subj="enterpriseSearchWhatsNextBoxButton"
                iconType="refresh"
                fill
              >
                <EuiFlexGroup responsive={false} gutterSize="xs">
                  <EuiFlexItem grow={false}>
                    {i18n.translate('xpack.enterpriseSearch.whatsNextBox.syncDataFlexItemLabel', {
                      defaultMessage: 'Sync data',
                    })}
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="arrowDown" />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                disabled={disabled}
                display="fill"
                size="m"
                data-test-subj="enterpriseSearchWhatsNextBoxButton"
                iconType="boxesVertical"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
