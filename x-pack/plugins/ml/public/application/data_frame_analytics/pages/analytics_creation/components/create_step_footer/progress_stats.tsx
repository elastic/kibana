/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AnalyticsProgressStats } from './create_step_footer';

interface Props {
  currentProgress?: AnalyticsProgressStats;
  failedJobMessage: string | undefined;
}

export const ProgressStats: FC<Props> = ({ currentProgress, failedJobMessage }) => {
  if (currentProgress === undefined) return null;

  return (
    <>
      <EuiSpacer />
      {failedJobMessage !== undefined && (
        <>
          <EuiCallOut
            data-test-subj="analyticsWizardProgressCallout"
            title={i18n.translate(
              'xpack.ml.dataframe.analytics.create.analyticsProgressCalloutTitle',
              {
                defaultMessage: 'Job failed',
              }
            )}
            color={'danger'}
            iconType={'alert'}
            size="s"
          >
            <p>{failedJobMessage}</p>
          </EuiCallOut>
          <EuiSpacer size="s" />
        </>
      )}
      <EuiText size="m">
        <strong>
          {i18n.translate('xpack.ml.dataframe.analytics.create.analyticsProgressTitle', {
            defaultMessage: 'Progress',
          })}
        </strong>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>
              {i18n.translate('xpack.ml.dataframe.analytics.create.analyticsProgressPhaseTitle', {
                defaultMessage: 'Phase',
              })}{' '}
              {currentProgress.currentPhase}/{currentProgress.totalPhases}
            </strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem style={{ width: '400px' }} grow={false}>
          <EuiProgress
            value={currentProgress.progress}
            max={100}
            color="primary"
            size="l"
            data-test-subj="mlAnalyticsCreationWizardProgress"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">{`${currentProgress.progress}%`}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
