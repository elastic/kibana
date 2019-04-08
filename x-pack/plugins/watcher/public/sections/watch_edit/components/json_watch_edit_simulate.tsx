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
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ExecuteDetails } from 'plugins/watcher/models/execute_details/execute_details';
import { WatchHistoryItem } from 'plugins/watcher/models/watch_history_item';
import { toastNotifications } from 'ui/notify';
import { ACTION_MODES, TIME_UNITS } from '../../../../common/constants';
import { ExecutedWatchDetails, ExecutedWatchResults } from '../../../../common/types/watch_types';
import { ErrableFormRow } from '../../../components/form_errors';
import { executeWatch } from '../../../lib/api';
import { WatchContext } from '../../../sections/watch_edit/components/watch_context';
import { timeUnits } from '../time_units';
import { JsonWatchEditSimulateResults } from './json_watch_edit_simulate_results';

const INPUT_OVERRIDE_ID = 'simulateExecutionInputOverride';

export const JsonWatchEditSimulate = ({
  executeWatchJsonString,
  setExecuteWatchJsonString,
  errors,
  setErrors,
  isShowingErrors,
  setIsShowingErrors,
  isDisabled,
  executeDetails,
  setExecuteDetails,
  watchActions,
}: {
  executeWatchJsonString: string;
  setExecuteWatchJsonString: (json: string) => void;
  errors: { [key: string]: string[] };
  setErrors: (errors: { [key: string]: string[] }) => void;
  isShowingErrors: boolean;
  setIsShowingErrors: (isShowingErrors: boolean) => void;
  isDisabled: boolean;
  executeDetails: ExecutedWatchDetails;
  setExecuteDetails: (details: ExecutedWatchDetails) => void;
  watchActions: Array<{
    actionId: string;
    actionMode: string;
    type: string;
  }>;
}) => {
  const { watch } = useContext(WatchContext);

  // hooks
  const [executeResults, setExecuteResults] = useState<ExecutedWatchResults | null>(null);

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
          options={[
            {
              value: ACTION_MODES.SIMULATE,
              text: ACTION_MODES.SIMULATE,
            },
            {
              value: ACTION_MODES.FORCE_SIMULATE,
              text: ACTION_MODES.FORCE_SIMULATE,
            },
            {
              value: ACTION_MODES.EXECUTE,
              text: ACTION_MODES.EXECUTE,
            },
            {
              value: ACTION_MODES.FORCE_EXECUTE,
              text: ACTION_MODES.FORCE_EXECUTE,
            },
            {
              value: ACTION_MODES.SKIP,
              text: ACTION_MODES.SKIP,
            },
          ]}
          value={executeDetails.actionModes[row.actionId]}
          onChange={e => {
            setExecuteDetails(
              new ExecuteDetails({
                ...executeDetails,
                actionModes: { ...executeDetails.actionModes, [row.actionId]: e.target.value },
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
      {executeResults && (
        <JsonWatchEditSimulateResults
          executeResults={executeResults}
          executeDetails={executeDetails}
          onCloseFlyout={() => setExecuteResults(null)}
        />
      )}
      <EuiText>
        <p>
          {i18n.translate('xpack.watcher.sections.watchEdit.simulate.pageDescription', {
            defaultMessage: 'Modify the fields below to simulate a watch execution.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="l" />
      <EuiForm>
        <EuiDescribedFormGroup
          fullWidth
          title={
            <h3>
              {i18n.translate(
                'xpack.watcher.sections.watchEdit.simulate.form.triggerOverridesTitle',
                { defaultMessage: 'Trigger overrides' }
              )}
            </h3>
          }
          description={i18n.translate(
            'xpack.watcher.sections.watchEdit.simulate.form.triggerOverridesDescription',
            {
              defaultMessage:
                'These fields are parsed as the data of the trigger event that will be used during the watch execution.',
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
              <EuiFlexItem grow={false}>
                <EuiFieldNumber
                  value={executeDetails.scheduledTimeValue}
                  min={0}
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
              <EuiFlexItem grow={false}>
                <EuiSelect
                  value={executeDetails.scheduledTimeUnit}
                  options={[
                    {
                      value: TIME_UNITS.SECOND,
                      text: timeUnits[TIME_UNITS.SECOND].labelPlural,
                    },
                    {
                      value: TIME_UNITS.MINUTE,
                      text: timeUnits[TIME_UNITS.MINUTE].labelPlural,
                    },
                    {
                      value: TIME_UNITS.HOUR,
                      text: timeUnits[TIME_UNITS.HOUR].labelPlural,
                    },
                  ]}
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
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiFieldNumber
                  value={executeDetails.triggeredTimeValue}
                  min={0}
                  onChange={e => {
                    const value = e.target.value;
                    setExecuteDetails(
                      new ExecuteDetails({
                        ...executeDetails,
                        triggeredTimeValue: value === '' ? value : parseInt(value, 10),
                      })
                    );
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSelect
                  value={executeDetails.triggeredTimeUnit}
                  options={[
                    {
                      value: TIME_UNITS.MILLISECOND,
                      text: timeUnits[TIME_UNITS.MILLISECOND].labelPlural,
                    },
                    {
                      value: TIME_UNITS.SECOND,
                      text: timeUnits[TIME_UNITS.SECOND].labelPlural,
                    },
                  ]}
                  onChange={e => {
                    setExecuteDetails(
                      new ExecuteDetails({
                        ...executeDetails,
                        triggeredTimeUnit: e.target.value,
                      })
                    );
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>
        </EuiDescribedFormGroup>
        <EuiDescribedFormGroup
          fullWidth
          idAria="simulateExecutionInputOverridesDescription"
          title={
            <h3>
              {i18n.translate(
                'xpack.watcher.sections.watchEdit.simulate.form.inputOverridesTitle',
                { defaultMessage: 'Input overrides' }
              )}
            </h3>
          }
          description={i18n.translate(
            'xpack.watcher.sections.watchEdit.simulate.form.inputOverridesDescription',
            {
              defaultMessage:
                'When present, the watch uses this object as a payload instead of executing its own input.',
            }
          )}
        >
          <ErrableFormRow
            id={INPUT_OVERRIDE_ID}
            describedByIds={['simulateExecutionInputOverridesDescription']}
            label={i18n.translate(
              'xpack.watcher.sections.watchEdit.simulate.form.alternativeInputFieldLabel',
              {
                defaultMessage: 'Alternative input',
              }
            )}
            errorKey={INPUT_OVERRIDE_ID}
            isShowingErrors={isShowingErrors}
            fullWidth
            errors={errors}
          >
            <EuiCodeEditor
              fullWidth
              mode="json"
              width="100%"
              theme="github"
              aria-label={i18n.translate(
                'xpack.watcher.sections.watchEdit.simulate.form.alternativeInputAriaLabel',
                {
                  defaultMessage: 'Code editor',
                }
              )}
              value={executeWatchJsonString}
              onChange={(json: string) => {
                setExecuteWatchJsonString(json);
                try {
                  const alternativeInput = json === '' ? undefined : JSON.parse(json);
                  if (
                    typeof alternativeInput === 'undefined' ||
                    (alternativeInput && typeof alternativeInput === 'object')
                  ) {
                    setExecuteDetails(
                      new ExecuteDetails({
                        ...executeDetails,
                        alternativeInput,
                      })
                    );
                    setIsShowingErrors(false);
                    setErrors({ ...errors, [INPUT_OVERRIDE_ID]: [] });
                  }
                } catch (e) {
                  setErrors({
                    ...errors,
                    [INPUT_OVERRIDE_ID]: [
                      i18n.translate(
                        'xpack.watcher.sections.watchEdit.simulate.form.alternativeInputFieldError',
                        {
                          defaultMessage: 'Invalid JSON',
                        }
                      ),
                    ],
                  });
                  setIsShowingErrors(true);
                }
              }}
            />
          </ErrableFormRow>
        </EuiDescribedFormGroup>
        <EuiDescribedFormGroup
          fullWidth
          title={
            <h3>
              {i18n.translate(
                'xpack.watcher.sections.watchEdit.simulate.form.conditionOverridesTitle',
                { defaultMessage: 'Condition overrides' }
              )}
            </h3>
          }
          description={i18n.translate(
            'xpack.watcher.sections.watchEdit.simulate.form.conditionOverridesDescription',
            {
              defaultMessage: 'When enabled, the watch execution uses the Always Condition.',
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
            checked={executeDetails.ignoreCondition}
            onChange={e => {
              setExecuteDetails(
                new ExecuteDetails({ ...executeDetails, ignoreCondition: e.target.checked })
              );
            }}
          />
        </EuiDescribedFormGroup>
        <EuiDescribedFormGroup
          fullWidth
          idAria="simulateExecutionActionModesDescription"
          title={
            <h3>
              {i18n.translate(
                'xpack.watcher.sections.watchEdit.simulate.form.actionOverridesTitle',
                { defaultMessage: 'Action overrides' }
              )}
            </h3>
          }
          description={i18n.translate(
            'xpack.watcher.sections.watchEdit.simulate.form.actionOverridesDescription',
            {
              defaultMessage:
                'The action modes determine how to handle the watch actions as part of the watch execution.',
            }
          )}
        >
          <EuiFormRow
            describedByIds={['simulateExecutionActionModesDescription']}
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
        <EuiButton
          iconType="play"
          fill
          type="submit"
          isDisabled={isDisabled}
          onClick={async () => {
            try {
              const executedWatch = await executeWatch(executeDetails, watch);
              const formattedResults = WatchHistoryItem.fromUpstreamJson(
                executedWatch.watchHistoryItem
              );
              setExecuteResults(formattedResults);
            } catch (e) {
              return toastNotifications.addDanger(e.data.message);
            }
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
