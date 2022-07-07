/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiSwitch,
  EuiPanel,
  EuiSpacer,
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';
import { CronEditor, Frequency } from '@kbn/es-ui-shared-plugin/public';
import { i18n } from '@kbn/i18n';

import { Status } from '../../../../../../common/types/api';
import { UnsavedChangesPrompt } from '../../../../shared/unsaved_changes_prompt';
import { UpdateConnectorSchedulingApiLogic } from '../../../api/connector_package/update_connector_scheduling_api_logic';
import { FetchIndexApiLogic } from '../../../api/index/fetch_index_api_logic';

import { ConnectorSchedulingLogic } from './connector_scheduling_logic';

export const ConnectorSchedulingComponent: React.FC = () => {
  const { data } = useValues(FetchIndexApiLogic);
  const { status } = useValues(UpdateConnectorSchedulingApiLogic);
  const { makeRequest } = useActions(UpdateConnectorSchedulingApiLogic);
  const { hasChanges } = useValues(ConnectorSchedulingLogic);
  const { setHasChanges } = useActions(ConnectorSchedulingLogic);

  const schedulingInput = data?.connector?.scheduling;
  const [scheduling, setScheduling] = useState(schedulingInput);
  const [fieldToPreferredValueMap, setFieldToPreferredValueMap] = useState({});
  const [simpleCron, setSimpleCron] = useState<{
    expression: string;
    frequency: Frequency;
  }>({
    expression: schedulingInput?.interval ?? '',
    frequency: schedulingInput?.interval ? cronToFrequency(schedulingInput.interval) : 'HOUR',
  });

  const editor = scheduling && (
    <CronEditor
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
        setScheduling({ ...scheduling, interval: expression });
        setHasChanges(true);
      }}
    />
  );

  return scheduling ? (
    <>
      <UnsavedChangesPrompt
        hasUnsavedChanges={hasChanges}
        messageText={i18n.translate(
          'xpack.enterpriseSearch.content.indices.connectorScheduling.unsaved.title',
          { defaultMessage: 'You have not saved your changes, are you sure you want to leave?' }
        )}
      />
      <EuiSpacer />
      <EuiPanel hasShadow={false} hasBorder>
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <EuiSwitch
              checked={scheduling.enabled}
              label={i18n.translate(
                'xpack.enterpriseSearch.content.indices.connectorScheduling.switch.label',
                { defaultMessage: 'Keep this source in sync' }
              )}
              onChange={(e) => {
                setScheduling({ ...scheduling, enabled: e.target.checked });
                setHasChanges(true);
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              {scheduling.enabled
                ? i18n.translate(
                    'xpack.enterpriseSearch.content.indices.connectorScheduling.switch.enabled.description',
                    {
                      defaultMessage:
                        'This source will automatically be kept in sync according to the schedule set below.',
                    }
                  )
                : i18n.translate(
                    'xpack.enterpriseSearch.content.indices.connectorScheduling.switch.disabled.description',
                    { defaultMessage: 'Source content will not be kept in sync.' }
                  )}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>{editor}</EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  disabled={!hasChanges || status === Status.LOADING || !data?.connector?.id}
                  onClick={() => {
                    setScheduling(schedulingInput);
                    setSimpleCron({
                      expression: schedulingInput?.interval ?? '',
                      frequency: schedulingInput?.interval
                        ? cronToFrequency(schedulingInput.interval)
                        : 'HOUR',
                    });
                    setHasChanges(false);
                  }}
                >
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.indices.connectorScheduling.saveButton.label',
                    { defaultMessage: 'Reset' }
                  )}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  disabled={!hasChanges || status === Status.LOADING || !data?.connector?.id}
                  onClick={() =>
                    makeRequest({ connectorId: data?.connector?.id ?? '', scheduling })
                  }
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
      </EuiPanel>
    </>
  ) : (
    <></>
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
  if (fields[1] === '*') {
    return 'MINUTE';
  }
  if (fields[2] === '*') {
    return 'HOUR';
  }
  if (fields[3] === '*') {
    return 'DAY';
  }
  if (fields[4] === '?') {
    return 'WEEK';
  }
  if (fields[4] === '*') {
    return 'MONTH';
  }
  return 'YEAR';
}
