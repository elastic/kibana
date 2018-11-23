/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * Renders the controls used for running a forecast.
 */

import PropTypes from 'prop-types';
import React from 'react';

import {
  EuiButton,
  EuiFieldText,
  EuiFlexItem,
  EuiFlexGroup,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiToolTip
} from '@elastic/eui';


// don't use something like plugins/ml/../common
// because it won't work with the jest tests
import { JOB_STATE } from '../../../../common/constants/states';
import { ForecastProgress } from './forecast_progress';
import { mlNodesAvailable } from 'plugins/ml/ml_nodes_check/check_ml_nodes';
import { checkPermission, createPermissionFailureMessage } from 'plugins/ml/privilege/check_privilege';


function getRunInputDisabledState(
  job,
  isForecastRequested) {
  // Disable the 'run forecast' text field and button if any of the conditions are met:
  // - No ML nodes are available
  // - No canForecastJob permission
  // - Job is not in an OPENED or CLOSED state
  // - A new forecast has been requested
  if (mlNodesAvailable() === false) {
    return {
      isDisabled: true,
      isDisabledToolTipText: 'There are no ML nodes available.'
    };
  }

  // TODO - use simpler interface to permission checking once it has been refactored.
  if (checkPermission('canForecastJob') === false) {
    return {
      isDisabled: true,
      isDisabledToolTipText: createPermissionFailureMessage('canForecastJob')
    };
  }

  if (job.state !== JOB_STATE.OPENED && job.state !== JOB_STATE.CLOSED) {
    return {
      isDisabled: true,
      isDisabledToolTipText: `Forecasts cannot be run on ${job.state} jobs`
    };
  }

  return { isDisabled: isForecastRequested };
}


export function RunControls({
  job,
  newForecastDuration,
  isNewForecastDurationValid,
  newForecastDurationErrors,
  onNewForecastDurationChange,
  runForecast,
  isForecastRequested,
  forecastProgress,
  jobOpeningState,
  jobClosingState }) {

  const disabledState = getRunInputDisabledState(
    job,
    isForecastRequested);

  const durationInput = (
    <EuiFieldText
      name="forecastDuration"
      value={newForecastDuration}
      disabled={disabledState.isDisabled}
      isInvalid={!isNewForecastDurationValid}
      onChange={onNewForecastDurationChange}
      fullWidth
    />
  );

  const runButton = (
    <EuiButton
      onClick={runForecast}
      isDisabled={disabledState.isDisabled || !isNewForecastDurationValid}
    >
      Run
    </EuiButton>
  );

  return (
    <div>
      <EuiText>
        <h3>Run a new forecast</h3>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiForm>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow
              label="Duration"
              fullWidth
              isInvalid={!isNewForecastDurationValid}
              error={newForecastDurationErrors}
              helpText={'Length of forecast, up to a maximum of 8 weeks. ' +
                'Use s for seconds, m for minutes, h for hours, d for days, w for weeks.'}
            >
              {disabledState.isDisabledToolTipText === undefined ? durationInput
                : (
                  <EuiToolTip
                    position="right"
                    content={disabledState.isDisabledToolTipText}
                  >
                    {durationInput}
                  </EuiToolTip>
                )}
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow hasEmptyLabelSpace>
              {disabledState.isDisabledToolTipText === undefined ? runButton
                : (
                  <EuiToolTip
                    position="left"
                    content={disabledState.isDisabledToolTipText}
                  >
                    {runButton}
                  </EuiToolTip>
                )}
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>
      <EuiSpacer size="s" />
      {isForecastRequested === true &&
        <ForecastProgress
          forecastProgress={forecastProgress}
          jobOpeningState={jobOpeningState}
          jobClosingState={jobClosingState}
        />
      }
    </div>
  );
}

RunControls.propType = {
  job: PropTypes.object,
  newForecastDuration: PropTypes.string,
  isNewForecastDurationValid: PropTypes.bool,
  newForecastDurationErrors: PropTypes.array,
  onNewForecastDurationChange: PropTypes.func.isRequired,
  runForecast: PropTypes.func.isRequired,
  isForecastRequested: PropTypes.bool,
  forecastProgress: PropTypes.number,
  jobOpeningState: PropTypes.number,
  jobClosingState: PropTypes.number,
};
