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

import { SyncJobType } from '../../../../../../../common/types/connectors';

import { ConnectorViewIndex, CrawlerViewIndex } from '../../../../types';

import { ConnectorSchedulingLogic } from '../connector_scheduling_logic';

import { ConnectorCronEditor } from './connector_cron_editor';

export interface ConnectorContentSchedulingProps {
  index: CrawlerViewIndex | ConnectorViewIndex;
  type: SyncJobType;
}
const getAccordionTitle = (type: ConnectorContentSchedulingProps['type']) => {
  switch (type) {
    case SyncJobType.FULL: {
      return 'Full content sync';
    }
    case SyncJobType.INCREMENTAL: {
      return 'Incremental content sync';
    }
    case SyncJobType.ACCESS_CONTROL: {
      return 'Access Control Sync';
    }
  }
};
const getDescriptionText = (type: ConnectorContentSchedulingProps['type']) => {
  switch (type) {
    case SyncJobType.FULL: {
      return 'Synchronize all data from your data source.';
    }
    case SyncJobType.INCREMENTAL: {
      return 'A lightweight sync job that only fetches updated content from your data source.';
    }
    case SyncJobType.ACCESS_CONTROL: {
      return 'Schedule access control syncs to keep permissions mappings up to date.';
    }
  }
};

export const ConnectorContentScheduling: React.FC<ConnectorContentSchedulingProps> = ({
  type,
  index,
}) => {
  const { setHasChanges, updateScheduling } = useActions(ConnectorSchedulingLogic);
  const schedulingInput = index.connector.scheduling;
  const [scheduling, setScheduling] = useState(schedulingInput);
  const [isAccordionOpen, setIsAccordionOpen] = useState<'open' | 'closed'>(
    scheduling[type].enabled ? 'open' : 'closed'
  );

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
          forceState={isAccordionOpen}
          onToggle={(isOpen) => {
            setIsAccordionOpen(isOpen ? 'open' : 'closed');
          }}
          extraAction={
            <EuiSwitch
              checked={scheduling[type].enabled}
              label={i18n.translate(
                'xpack.enterpriseSearch.content.indices.connectorScheduling.switch.label',
                { defaultMessage: 'Enabled' }
              )}
              onChange={(e) => {
                if (e.target.checked) {
                  setIsAccordionOpen('open');
                }
                setScheduling({
                  ...scheduling,
                  ...{
                    [type]: { enabled: e.target.checked, interval: scheduling[type].interval },
                  },
                });
                setHasChanges(type);
              }}
            />
          }
        >
          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              <ConnectorCronEditor
                scheduling={scheduling[type]}
                type={type}
                onReset={() => {
                  setScheduling({
                    ...schedulingInput,
                  });
                }}
                onSave={(interval) => {
                  updateScheduling(type, {
                    connectorId: index.connector.id,
                    scheduling: {
                      ...index.connector.scheduling,
                      [type]: {
                        ...scheduling[type],
                        interval,
                      },
                    },
                  });
                }}
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
