/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Renders the progress of the various actions involved in running a forecast on an ML job.
 */

import PropTypes from 'prop-types';
import React from 'react';

import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';

import { ProgressIcon } from './progress_icon';
import { PROGRESS_STATES } from './progress_states';
import { FormattedMessage } from '@kbn/i18n/react';

export function ForecastProgress({ forecastProgress, jobOpeningState, jobClosingState }) {
  return (
    <div>
      {jobOpeningState !== PROGRESS_STATES.UNSET && (
        <React.Fragment>
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiText size="xs">
                <h3>
                  <FormattedMessage
                    id="xpack.ml.timeSeriesExplorer.forecastingModal.openingJobTitle"
                    defaultMessage="Opening job…"
                  />
                </h3>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ProgressIcon state={jobOpeningState} />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
        </React.Fragment>
      )}
      {forecastProgress !== PROGRESS_STATES.UNSET && (
        <React.Fragment>
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiText size="xs">
                <h3>
                  <FormattedMessage
                    id="xpack.ml.timeSeriesExplorer.forecastingModal.runningForecastTitle"
                    defaultMessage="Running forecast…"
                  />
                </h3>
              </EuiText>
            </EuiFlexItem>
            {forecastProgress >= 0 && (
              <EuiFlexItem>
                <EuiToolTip position="top" content={forecastProgress + '%'}>
                  <EuiProgress size="l" value={forecastProgress} max={100} />
                </EuiToolTip>
              </EuiFlexItem>
            )}
            {forecastProgress === PROGRESS_STATES.ERROR && (
              <EuiFlexItem grow={false}>
                <ProgressIcon state={PROGRESS_STATES.ERROR} />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <EuiSpacer size="s" />
        </React.Fragment>
      )}
      {jobClosingState !== PROGRESS_STATES.UNSET && (
        <React.Fragment>
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiText size="xs">
                <h3>
                  <FormattedMessage
                    id="xpack.ml.timeSeriesExplorer.forecastingModal.closingJobTitle"
                    defaultMessage="Closing job…"
                  />
                </h3>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ProgressIcon state={jobClosingState} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </React.Fragment>
      )}
    </div>
  );
}

ForecastProgress.propType = {
  forecastProgress: PropTypes.number,
  jobOpeningState: PropTypes.number,
  jobClosingState: PropTypes.number,
};
