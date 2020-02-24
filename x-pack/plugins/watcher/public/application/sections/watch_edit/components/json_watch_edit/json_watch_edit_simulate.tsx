/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useContext, useState } from 'react';

import {
  EuiBasicTable,
  EuiButton,
  EuiCodeEditor,
  EuiDescribedFormGroup,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { WatchHistoryItem } from '../../../../models/watch_history_item';

import { ACTION_MODES, TIME_UNITS } from '../../../../../../common/constants';
import { ExecuteDetails } from '../../../../models/execute_details';
import {
  ExecutedWatchDetails,
  ExecutedWatchResults,
} from '../../../../../../common/types/watch_types';
import { ErrableFormRow } from '../../../../components/form_errors';
import { executeWatch } from '../../../../lib/api';
import { WatchContext } from '../../watch_context';
import { JsonWatchEditSimulateResults } from './json_watch_edit_simulate_results';
import { getTimeUnitLabel } from '../../../../lib/get_time_unit_label';
import { useAppContext } from '../../../../app_context';

import { useXJsonMode } from './use_x_json_mode';

const actionModeOptions = Object.keys(ACTION_MODES).map(mode => ({
  text: ACTION_MODES[mode],
  value: ACTION_MODES[mode],
}));

const getScheduleTimeOptions = (unitSize = '0') =>
  Object.entries(TIME_UNITS)
    .filter(([key]) => key !== TIME_UNITS.DAY)
    .map(([_key, value]) => {
      return {
        text: getTimeUnitLabel(value, unitSize),
        value,
      };
    });

export const JsonWatchEditSimulate = ({
  executeWatchErrors,
  hasExecuteWatchErrors,
  executeDetails,
  setExecuteDetails,
  watchActions,
}: {
  executeWatchErrors: { [key: string]: string[] };
  hasExecuteWatchErrors: boolean;
  executeDetails: ExecutedWatchDetails;
  setExecuteDetails: (details: ExecutedWatchDetails) => void;
  watchActions: Array<{
    actionId: string;
    actionMode: string;
    type: string;
  }>;
}) => {
  const {
    links: { executeWatchApiUrl },
  } = useAppContext();
  const { watch } = useContext(WatchContext);

  // hooks
  const [executeResults, setExecuteResults] = useState<ExecutedWatchResults | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executeResultsError, setExecuteResultsError] = useState<any>(null);

  const { errors: watchErrors } = watch.validate();
  const hasWatchJsonError = watchErrors.json.length >= 1;

  const {
    actionModes,
    scheduledTimeValue,
    scheduledTimeUnit,
    triggeredTimeValue,
    alternativeInput,
    ignoreCondition,
  } = executeDetails;

  const { setXJson, convertToJson, xJsonMode, xJson } = useXJsonMode(alternativeInput);

  const columns = [
    {
      field: 'actionId',
      name: i18n.translate('xpack.watcher.sections.watchEdit.simulate.table.idColumnLabel', {
        defaultMessage: 'ID',
      }),
      sortable: true,
      truncateText: true,
    },
    {
      field: 'type',
      name: i18n.translate('xpack.watcher.sections.watchEdit.simulate.table.typeColumnLabel', {
        defaultMessage: 'Type',
      }),
      truncateText: true,
    },
    {
      field: 'actionMode',
      name: i18n.translate('xpack.watcher.sections.watchEdit.simulate.table.modeColumnLabel', {
        defaultMessage: 'Mode',
      }),
      render: ({}, row: { actionId: string }) => (
        <EuiSelect
          options={actionModeOptions}
          value={actionModes[row.actionId]}
          data-test-subj="actionModesSelect"
          onChange={e => {
            setExecuteDetails(
              new ExecuteDetails({
                ...executeDetails,
                actionModes: { ...actionModes, [row.actionId]: e.target.value },
              })
            );
          }}
          aria-label={i18n.translate(
            'xpack.watcher.sections.watchEdit.simulate.table.modeSelectLabel',
            {
              defaultMessage: 'Action modes',
            }
          )}
        />
      ),
    },
  ];

  return (
    <Fragment>
      <JsonWatchEditSimulateResults
        executeResults={executeResults}
        executeDetails={executeDetails}
        error={executeResultsError}
        onCloseFlyout={() => {
          setExecuteResults(null);
          setExecuteResultsError(null);
        }}
      />
      <EuiText>
        <p>
          {i18n.translate('xpack.watcher.sections.watchEdit.simulate.pageDescription', {
            defaultMessage:
              'Use the simulator to override the watch schedule, condition, actions, and input results.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="l" />
      <EuiForm data-test-subj="jsonWatchSimulateForm">
        <EuiDescribedFormGroup
          fullWidth
          title={
            <h2>
              {i18n.translate(
                'xpack.watcher.sections.watchEdit.simulate.form.triggerOverridesTitle',
                { defaultMessage: 'Trigger' }
              )}
            </h2>
          }
          description={i18n.translate(
            'xpack.watcher.sections.watchEdit.simulate.form.triggerOverridesDescription',
            {
              defaultMessage: 'Set the time and date for starting the watch.',
            }
          )}
        >
          <EuiFormRow
            label={i18n.translate(
              'xpack.watcher.sections.watchEdit.simulate.form.scheduledTimeFieldLabel',
              {
                defaultMessage: 'Schedule every',
              }
            )}
          >
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFieldNumber
                  value={
                    scheduledTimeValue == null || scheduledTimeValue === ''
                      ? scheduledTimeValue
                      : parseInt(scheduledTimeValue, 10)
                  }
                  min={0}
                  data-test-subj="scheduledTimeInput"
                  onChange={e => {
                    const value = e.target.value;
                    setExecuteDetails(
                      new ExecuteDetails({
                        ...executeDetails,
                        scheduledTimeValue: value === '' ? value : parseInt(value, 10),
                      })
                    );
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiSelect
                  value={scheduledTimeUnit}
                  options={getScheduleTimeOptions(scheduledTimeValue)}
                  onChange={e => {
                    setExecuteDetails(
                      new ExecuteDetails({
                        ...executeDetails,
                        scheduledTimeUnit: e.target.value,
                      })
                    );
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate(
              'xpack.watcher.sections.watchEdit.simulate.form.triggeredTimeFieldLabel',
              {
                defaultMessage: 'Trigger after',
              }
            )}
          >
            <EuiFieldNumber
              value={
                triggeredTimeValue == null || triggeredTimeValue === ''
                  ? triggeredTimeValue
                  : parseInt(triggeredTimeValue, 10)
              }
              min={0}
              data-test-subj="triggeredTimeInput"
              append={
                <EuiText size="s">
                  {getTimeUnitLabel(TIME_UNITS.SECOND, triggeredTimeValue)}
                </EuiText>
              }
              onChange={e => {
                const value = e.target.value;
                setExecuteDetails(
                  new ExecuteDetails({
                    ...executeDetails,
                    triggeredTimeValue: value === '' ? value : parseInt(value, 10),
                    triggeredTimeUnit: TIME_UNITS.SECOND,
                  })
                );
              }}
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>

        <EuiDescribedFormGroup
          fullWidth
          title={
            <h2>
              {i18n.translate(
                'xpack.watcher.sections.watchEdit.simulate.form.conditionOverridesTitle',
                { defaultMessage: 'Condition' }
              )}
            </h2>
          }
          description={i18n.translate(
            'xpack.watcher.sections.watchEdit.simulate.form.conditionOverridesDescription',
            {
              defaultMessage:
                'Execute the watch when the condition is met. Otherwise, ignore the condition and run the watch on a fixed schedule.',
            }
          )}
        >
          <EuiSwitch
            label={i18n.translate(
              'xpack.watcher.sections.watchEdit.simulate.form.ignoreConditionFieldLabel',
              {
                defaultMessage: 'Ignore condition',
              }
            )}
            checked={ignoreCondition}
            data-test-subj="ignoreConditionSwitch"
            onChange={e => {
              setExecuteDetails(
                new ExecuteDetails({ ...executeDetails, ignoreCondition: e.target.checked })
              );
            }}
          />
        </EuiDescribedFormGroup>

        <EuiDescribedFormGroup
          fullWidth
          title={
            <h2>
              {i18n.translate(
                'xpack.watcher.sections.watchEdit.simulate.form.actionOverridesTitle',
                { defaultMessage: 'Actions' }
              )}
            </h2>
          }
          description={
            <FormattedMessage
              id="xpack.watcher.sections.watchEdit.simulate.form.actionOverridesDescription"
              defaultMessage="Allow the watch to execute or skip actions. {actionsLink}"
              values={{
                actionsLink: (
                  <EuiLink href={executeWatchApiUrl} target="_blank">
                    {i18n.translate(
                      'xpack.watcher.sections.watchEdit.simulate.form.actionOverridesDescription.linkLabel',
                      {
                        defaultMessage: 'Learn about actions.',
                      }
                    )}
                  </EuiLink>
                ),
              }}
            />
          }
        >
          <EuiFormRow
            label={i18n.translate(
              'xpack.watcher.sections.watchEdit.simulate.form.actionModesFieldLabel',
              {
                defaultMessage: 'Action modes',
              }
            )}
            fullWidth
          >
            <EuiBasicTable
              items={watchActions}
              itemId="simulateExecutionActionModesTable"
              columns={columns}
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>

        <EuiDescribedFormGroup
          fullWidth
          title={
            <h2>
              {i18n.translate(
                'xpack.watcher.sections.watchEdit.simulate.form.inputOverridesTitle',
                { defaultMessage: 'Input' }
              )}
            </h2>
          }
          description={i18n.translate(
            'xpack.watcher.sections.watchEdit.simulate.form.inputOverridesDescription',
            {
              defaultMessage:
                'Enter JSON data to override the watch payload that comes from running the input.',
            }
          )}
        >
          <ErrableFormRow
            id="executeWatchJson"
            label={i18n.translate(
              'xpack.watcher.sections.watchEdit.simulate.form.alternativeInputFieldLabel',
              {
                defaultMessage: 'Alternative input',
              }
            )}
            errorKey="json"
            isShowingErrors={hasExecuteWatchErrors}
            fullWidth
            errors={executeWatchErrors}
          >
            <EuiCodeEditor
              fullWidth
              mode={xJsonMode}
              width="100%"
              height="200px"
              theme="textmate"
              aria-label={i18n.translate(
                'xpack.watcher.sections.watchEdit.simulate.form.alternativeInputAriaLabel',
                {
                  defaultMessage: 'Code editor',
                }
              )}
              value={xJson}
              onChange={(xjson: string) => {
                setXJson(xjson);
                setExecuteDetails(
                  new ExecuteDetails({
                    ...executeDetails,
                    alternativeInput: convertToJson(xjson),
                  })
                );
              }}
            />
          </ErrableFormRow>
        </EuiDescribedFormGroup>
        <EuiButton
          iconType="play"
          data-test-subj="simulateWatchButton"
          fill
          type="submit"
          isLoading={isExecuting}
          isDisabled={hasExecuteWatchErrors || hasWatchJsonError}
          onClick={async () => {
            setIsExecuting(true);

            const { data, error } = await executeWatch(executeDetails, watch);

            setIsExecuting(false);

            if (error) {
              return setExecuteResultsError(error);
            }

            const formattedResults = WatchHistoryItem.fromUpstreamJson(data.watchHistoryItem);
            setExecuteResults(formattedResults);
          }}
        >
          {i18n.translate('xpack.watcher.sections.watchEdit.simulate.form.saveButtonLabel', {
            defaultMessage: 'Simulate watch',
          })}
        </EuiButton>
      </EuiForm>
    </Fragment>
  );
};
