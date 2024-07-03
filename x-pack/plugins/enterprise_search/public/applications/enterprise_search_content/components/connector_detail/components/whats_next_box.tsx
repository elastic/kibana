/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { ConnectorStatus } from '@kbn/search-connectors';

import { APPLICATIONS_PLUGIN } from '../../../../../../common/constants';

import { PLAYGROUND_PATH } from '../../../../applications/routes';
import { generateEncodedPath } from '../../../../shared/encode_path_params';
import { KibanaLogic } from '../../../../shared/kibana';
import { EuiButtonTo } from '../../../../shared/react_router_helpers';
import { CONNECTOR_DETAIL_TAB_PATH } from '../../../routes';
import { SyncsContextMenu } from '../../shared/header_actions/syncs_context_menu';

import { ConnectorDetailTabId } from '../connector_detail';

export interface WhatsNextBoxProps {
  connectorId: string;
  connectorIndex?: string;
  connectorStatus: ConnectorStatus;
  disabled?: boolean;
  isSyncing?: boolean;
  isWaitingForConnector?: boolean;
}

export const WhatsNextBox: React.FC<WhatsNextBoxProps> = ({
  connectorId,
  connectorIndex,
  connectorStatus,
  disabled = false,
  isSyncing = false,
  isWaitingForConnector = false,
}) => {
  const { navigateToUrl } = useValues(KibanaLogic);
  const isConfigured = !(
    connectorStatus === ConnectorStatus.NEEDS_CONFIGURATION ||
    connectorStatus === ConnectorStatus.CREATED
  );
  return (
    <EuiPanel hasBorder style={{ position: 'relative' }}>
      {isSyncing && <EuiProgress size="xs" position="absolute" />}
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
            disabled={!connectorIndex || disabled}
            onClick={() => {
              navigateToUrl(
                `${APPLICATIONS_PLUGIN.URL}${PLAYGROUND_PATH}?default-index=${connectorIndex}`,
                {
                  shouldNotCreateHref: true,
                }
              );
            }}
          >
            <FormattedMessage
              id="xpack.enterpriseSearch.whatsNextBox.searchPlaygroundButtonLabel"
              defaultMessage="Search Playground"
            />
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonTo
            data-test-subj="entSearchContent-connector-configuration-setScheduleAndSync"
            data-telemetry-id="entSearchContent-connector-configuration-setScheduleAndSync"
            isDisabled={isWaitingForConnector || !connectorIndex || !isConfigured}
            to={`${generateEncodedPath(CONNECTOR_DETAIL_TAB_PATH, {
              connectorId,
              tabId: ConnectorDetailTabId.SCHEDULING,
            })}`}
          >
            {i18n.translate(
              'xpack.enterpriseSearch.content.connector_detail.configurationConnector.steps.schedule.button.label',
              {
                defaultMessage: 'Set schedule and sync',
              }
            )}
          </EuiButtonTo>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFlexGroup responsive={false} gutterSize="xs">
            <EuiFlexItem grow={false}>
              <SyncsContextMenu
                disabled={isWaitingForConnector || !connectorIndex || !isConfigured}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
