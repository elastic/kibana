/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useActions } from 'kea';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiSwitch,
  EuiPanel,
  EuiAccordion,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { UpdateConnectorSchedulingApiLogic } from '../../../../api/connector/update_connector_scheduling_api_logic';

import { ConnectorViewIndex, CrawlerViewIndex } from '../../../../types';

import { ConnectorSchedulingLogic } from '../connector_scheduling_logic';

import { ConnectorCronEditor } from './connector_cron_editor';

export interface ConnectorContentSchedulingProps {
  index: CrawlerViewIndex | ConnectorViewIndex;
  type: 'full' | 'incremental' | 'access_control'; // TODO EFE once DLS Pr merged change with SYNCJOBTYPE
}
const getAccordionTitle = (type: ConnectorContentSchedulingProps['type']) => {
  switch (type) {
    case 'full': {
      return 'Full content sync';
    }
    case 'incremental': {
      return 'Incremental content sync';
    }
    case 'access_control': {
      return 'Access Control Sync';
    }
  }
};
const getDescriptionText = (type: ConnectorContentSchedulingProps['type']) => {
  switch (type) {
    case 'full': {
      return 'Synchronize all data from your data source.';
    }
    case 'incremental': {
      return 'A lightweight sync job that only fetches updated content from your data source.';
    }
    case 'access_control': {
      return 'Schedule access control syncs to keep permissions mappings up to date.';
    }
  }
};

export const ConnectorContentScheduling: React.FC<ConnectorContentSchedulingProps> = ({
  type,
  index,
}) => {
  const { setHasChanges } = useActions(ConnectorSchedulingLogic);
  const { makeRequest } = useActions(UpdateConnectorSchedulingApiLogic);

  const schedulingInput = index.connector.scheduling;
  const [scheduling, setScheduling] = useState(schedulingInput);

  return (
    <>
      <EuiPanel hasShadow={false} hasBorder>
        <EuiAccordion
          paddingSize="m"
          id={`${type}-content-sync-schedule`}
          buttonContent={
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h4>{getAccordionTitle(type)}</h4>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  <p>{getDescriptionText(type)}</p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          initialIsOpen={scheduling[type].enabled}
          extraAction={
            <EuiSwitch
              checked={scheduling[type].enabled}
              label={i18n.translate(
                'xpack.enterpriseSearch.content.indices.connectorScheduling.switch.label',
                { defaultMessage: 'Enabled' }
              )}
              onChange={(e) => {
                setScheduling({
                  ...scheduling,
                  ...{
                    [type]: { enabled: e.target.checked, interval: scheduling[type].interval },
                  },
                });
                setHasChanges(true);
              }}
            />
          }
        >
          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              <ConnectorCronEditor
                schedulingInput={schedulingInput[type]}
                type={type}
                onSave={(schedule) =>
                  makeRequest({
                    connectorId: index.connector.id,
                    scheduling: {
                      ...schedulingInput,
                      [type]: schedule,
                    },
                  })
                }
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiAccordion>
      </EuiPanel>
    </>
  );
};

export interface Schedule {
  days: string;
  hours: string;
  minutes: string;
}
