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
  EuiCallOut,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { Status } from '../../../../../../common/types/api';
import { ConnectorStatus } from '../../../../../../common/types/connectors';
import { ConnectorIndex } from '../../../../../../common/types/indices';
import { CronEditor } from '../../../../shared/cron_editor';
import { Frequency } from '../../../../shared/cron_editor/types';
import { generateEncodedPath } from '../../../../shared/encode_path_params';
import { EuiButtonTo } from '../../../../shared/react_router_helpers';
import { UnsavedChangesPrompt } from '../../../../shared/unsaved_changes_prompt';
import { UpdateConnectorSchedulingApiLogic } from '../../../api/connector/update_connector_scheduling_api_logic';

import { SEARCH_INDEX_TAB_PATH } from '../../../routes';
import { IngestionStatus } from '../../../types';
import { isConnectorIndex } from '../../../utils/indices';

import { IndexViewLogic } from '../index_view_logic';

import { SearchIndexTabId } from '../search_index';

import { ConnectorSchedulingLogic } from './connector_scheduling_logic';

export const ConnectorSchedulingComponent: React.FC = () => {
  const { index, ingestionStatus } = useValues(IndexViewLogic);
  const { status } = useValues(UpdateConnectorSchedulingApiLogic);
  const { makeRequest } = useActions(UpdateConnectorSchedulingApiLogic);
  const { hasChanges } = useValues(ConnectorSchedulingLogic);
  const { setHasChanges } = useActions(ConnectorSchedulingLogic);

  // Need to do this ugly casting because we can't check this after the below typecheck, because useState can't be used after an if
  const schedulingInput = (index as ConnectorIndex)?.connector?.scheduling;
  const [scheduling, setScheduling] = useState(schedulingInput);
  const [fieldToPreferredValueMap, setFieldToPreferredValueMap] = useState({});
  const [simpleCron, setSimpleCron] = useState<{
    expression: string;
    frequency: Frequency;
  }>({
    expression: schedulingInput?.interval ?? '',
    frequency: schedulingInput?.interval ? cronToFrequency(schedulingInput.interval) : 'HOUR',
  });

  if (!isConnectorIndex(index)) {
    return <></>;
  }

  if (
    index.connector.status === ConnectorStatus.CREATED ||
    index.connector.status === ConnectorStatus.NEEDS_CONFIGURATION
  ) {
    return (
      <>
        <EuiSpacer />
        <EuiCallOut
          iconType="iInCircle"
          title={i18n.translate(
            'xpack.enterpriseSearch.content.indices.connectorScheduling.notConnected.title',
            {
              defaultMessage: 'Configure your connector to schedule a sync',
            }
          )}
        >
          <EuiText size="s">
            {i18n.translate(
              'xpack.enterpriseSearch.content.indices.connectorScheduling.notConnected.description',
              {
                defaultMessage:
                  'Configure and deploy your connector, then return here to set your sync schedule. This schedule will dictate the interval that the connector will sync with your data source for updated documents.',
              }
            )}
          </EuiText>
          <EuiSpacer size="s" />
          <EuiButtonTo
            data-telemetry-id="entSearchContent-connector-scheduling-configure"
            to={generateEncodedPath(SEARCH_INDEX_TAB_PATH, {
              indexName: index.name,
              tabId: SearchIndexTabId.CONFIGURATION,
            })}
            fill
            size="s"
          >
            {i18n.translate(
              'xpack.enterpriseSearch.content.indices.connectorScheduling.notConnected.button.label',
              {
                defaultMessage: 'Configure',
              }
            )}
          </EuiButtonTo>
        </EuiCallOut>
      </>
    );
  }

  return (
    <>
      <UnsavedChangesPrompt
        hasUnsavedChanges={hasChanges}
        messageText={i18n.translate(
          'xpack.enterpriseSearch.content.indices.connectorScheduling.unsaved.title',
          { defaultMessage: 'You have not saved your changes, are you sure you want to leave?' }
        )}
      />
      <EuiSpacer />
      <EuiPanel hasShadow={false} hasBorder className="schedulingPanel">
        <EuiFlexGroup direction="column">
          {ingestionStatus === IngestionStatus.ERROR ? (
            <EuiCallOut
              color="warning"
              iconType="alert"
              title={i18n.translate(
                'xpack.enterpriseSearch.content.indices.connectorScheduling.error.title',
                { defaultMessage: 'Review your connector configuration for reported errors.' }
              )}
            />
          ) : (
            <></>
          )}
          <EuiFlexItem>
            <EuiSwitch
              checked={scheduling.enabled}
              label={i18n.translate(
                'xpack.enterpriseSearch.content.indices.connectorScheduling.switch.label',
                { defaultMessage: 'Enable recurring syncs with the following schedule' }
              )}
              onChange={(e) => {
                setScheduling({ ...scheduling, enabled: e.target.checked });
                setHasChanges(true);
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.connectorScheduling.configured.description',
                {
                  defaultMessage:
                    'Your connector is configured and deployed. Configure a one-time sync by clicking the Sync button, or enable a recurring sync schedule. ',
                }
              )}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <CronEditor
              data-telemetry-id="entSearchContent-connector-scheduling-editSchedule"
              disabled={!scheduling.enabled}
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
              frequencyBlockList={['MINUTE']}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-telemetry-id="entSearchContent-connector-scheduling-resetSchedule"
                  disabled={!hasChanges || status === Status.LOADING}
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
                    'xpack.enterpriseSearch.content.indices.connectorScheduling.resetButton.label',
                    { defaultMessage: 'Reset' }
                  )}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-telemetry-id="entSearchContent-connector-scheduling-saveSchedule"
                  disabled={!hasChanges || status === Status.LOADING}
                  onClick={() => makeRequest({ connectorId: index.connector.id, scheduling })}
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
