/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, memo } from 'react';
import { EuiCallOut, EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { SAVE_STATE } from '../page';

interface CreateResultCalloutProps {
  saveState: SAVE_STATE;
  resultsUrl: string;
  onReset: () => {};
}

export const CreateResultCallout: FC<CreateResultCalloutProps> = memo(
  ({ saveState, resultsUrl, onReset }) => {
    if (saveState === SAVE_STATE.NOT_SAVED) {
      return null;
    }
    return (
      <>
        {saveState === SAVE_STATE.SAVED && (
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.ml.newJob.recognize.jobsCreatedTitle"
                defaultMessage="Jobs created"
              />
            }
            color="success"
            iconType="checkInCircleFilled"
          />
        )}
        {saveState === SAVE_STATE.FAILED && (
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.ml.newJob.simple.recognize.jobsCreationFailedTitle"
                defaultMessage="Jobs creation failed"
              />
            }
            color="danger"
            iconType="alert"
          />
        )}
        {saveState === SAVE_STATE.PARTIAL_FAILURE && (
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.ml.newJob.recognize.someJobsCreationFailedTitle"
                defaultMessage="Some jobs failed to be created"
              />
            }
            color="warning"
            iconType="alert"
          />
        )}
        <EuiSpacer size="l" />
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
          {saveState !== SAVE_STATE.SAVING && (
            <EuiFlexItem grow={false}>
              <EuiButton
                color="primary"
                fill={false}
                aria-label={i18n.translate(
                  'xpack.ml.newJob.recognize.jobsCreationFailed.resetButtonAriaLabel',
                  { defaultMessage: 'Reset' }
                )}
                onClick={onReset}
              >
                <FormattedMessage
                  id="xpack.ml.newJob.recognize.someJobsCreationFailed.resetButtonLabel"
                  defaultMessage="Reset"
                />
              </EuiButton>
            </EuiFlexItem>
          )}
          {(saveState === SAVE_STATE.SAVED || saveState === SAVE_STATE.PARTIAL_FAILURE) && (
            <EuiFlexItem grow={false}>
              <EuiButton
                color="primary"
                fill={true}
                href={resultsUrl}
                aria-label={i18n.translate('xpack.ml.newJob.recognize.viewResultsAriaLabel', {
                  defaultMessage: 'View results',
                })}
              >
                <FormattedMessage
                  id="xpack.ml.newJob.recognize.viewResultsLinkText"
                  defaultMessage="View results"
                />
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </>
    );
  }
);
