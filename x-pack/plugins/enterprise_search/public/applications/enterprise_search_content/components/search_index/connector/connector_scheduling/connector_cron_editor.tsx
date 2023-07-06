/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useActions, useValues } from 'kea';

import { EuiFlexItem, EuiFlexGroup, EuiButton, EuiButtonEmpty } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { Status } from '../../../../../../../common/types/api';
import { ConnectorScheduling, SyncJobType } from '../../../../../../../common/types/connectors';
import { CronEditor } from '../../../../../shared/cron_editor';
import { Frequency } from '../../../../../shared/cron_editor/types';
import { UpdateConnectorSchedulingApiLogic } from '../../../../api/connector/update_connector_scheduling_api_logic';
import { ConnectorSchedulingLogic } from '../connector_scheduling_logic';

interface ConnectorCronEditorProps {
  disabled?: boolean;
  frequencyBlockList?: string[];
  onReset?(): void;
  onSave?(interval: ConnectorScheduling['interval']): void;
  scheduling: ConnectorScheduling;
  type: SyncJobType;
}

export const ConnectorCronEditor: React.FC<ConnectorCronEditorProps> = ({
  disabled = false,
  frequencyBlockList = ['MINUTE'],
  scheduling,
  onSave,
  onReset,
  type,
}) => {
  const { status } = useValues(UpdateConnectorSchedulingApiLogic);
  const { hasFullSyncChanges, hasAccessSyncChanges, hasIncrementalSyncChanges } =
    useValues(ConnectorSchedulingLogic);
  const { clearHasChanges, setHasChanges } = useActions(ConnectorSchedulingLogic);
  const [newInterval, setNewInterval] = useState(scheduling.interval);
  const [fieldToPreferredValueMap, setFieldToPreferredValueMap] = useState({});
  const [simpleCron, setSimpleCron] = useState<{
    expression: string;
    frequency: Frequency;
  }>({
    expression: scheduling.interval ?? '',
    frequency: scheduling.interval ? cronToFrequency(scheduling.interval) : 'HOUR',
  });
  const hasChanges =
    type === SyncJobType.FULL
      ? hasFullSyncChanges
      : type === SyncJobType.INCREMENTAL
      ? hasIncrementalSyncChanges
      : hasAccessSyncChanges;

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <CronEditor
          data-telemetry-id="entSearchContent-connector-scheduling-editSchedule"
          disabled={!scheduling.enabled || disabled}
          fieldToPreferredValueMap={fieldToPreferredValueMap}
          cronExpression={simpleCron.expression}
          frequency={simpleCron.frequency}
          onChange={({
            cronExpression: expression,
            frequency,
            fieldToPreferredValueMap: newFieldToPreferredValueMap,
          }) => {
            setSimpleCron({
              expression,
              frequency,
            });
            setFieldToPreferredValueMap(newFieldToPreferredValueMap);
            setNewInterval(expression);
            setHasChanges(type);
          }}
          frequencyBlockList={frequencyBlockList}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-telemetry-id="entSearchContent-connector-scheduling-resetSchedule"
              disabled={!hasChanges || status === Status.LOADING || disabled}
              onClick={() => {
                setNewInterval(scheduling.interval);
                setSimpleCron({
                  expression: scheduling.interval ?? '',
                  frequency: scheduling.interval ? cronToFrequency(scheduling.interval) : 'HOUR',
                });
                clearHasChanges(type);
                if (onReset) {
                  onReset();
                }
              }}
            >
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.connectorScheduling.resetButton.label',
                { defaultMessage: 'Reset' }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-telemetry-id="entSearchContent-connector-scheduling-saveSchedule"
              disabled={!hasChanges || status === Status.LOADING || disabled}
              onClick={() => onSave && onSave(newInterval)}
            >
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.connectorScheduling.saveButton.label',
                { defaultMessage: 'Save' }
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export interface Schedule {
  days: string;
  hours: string;
  minutes: string;
}

function cronToFrequency(cron: string): Frequency {
  const fields = cron.split(' ');
  if (fields.length < 4) {
    return 'YEAR';
  }
  if (fields[1] === '*' || fields[1].includes(',')) {
    return 'MINUTE';
  }
  if (fields[2] === '*') {
    return 'HOUR';
  }
  if (fields[3] === '*') {
    return 'DAY';
  }
  if (fields[3] === '?') {
    return 'WEEK';
  }
  if (fields[4] === '*') {
    return 'MONTH';
  }
  return 'YEAR';
}
