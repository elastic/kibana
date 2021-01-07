/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSwitch, EuiFormRow, EuiSpacer } from '@elastic/eui';
interface Props {
  startDatafeed: boolean;
  setStartDatafeed(start: boolean): void;
  disabled?: boolean;
}

export const StartDatafeedSwitch: FC<Props> = ({
  startDatafeed,
  setStartDatafeed,
  disabled = false,
}) => {
  return (
    <>
      <EuiSpacer />
      <EuiFormRow
        helpText={i18n.translate(
          'xpack.ml.newJob.wizard.summaryStep.startDatafeedCheckboxHelpText',
          {
            defaultMessage: 'If unselected, job can be started later from the jobs list.',
          }
        )}
      >
        <EuiSwitch
          data-test-subj="mlJobWizardStartDatafeedCheckbox"
          label={i18n.translate('xpack.ml.newJob.wizard.summaryStep.startDatafeedCheckbox', {
            defaultMessage: 'Start immediately',
          })}
          checked={startDatafeed}
          onChange={(e) => setStartDatafeed(e.target.checked)}
          disabled={disabled}
        />
      </EuiFormRow>
    </>
  );
};
