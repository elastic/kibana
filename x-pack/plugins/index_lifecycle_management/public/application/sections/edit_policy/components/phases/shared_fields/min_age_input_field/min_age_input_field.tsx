/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { FunctionComponent } from 'react';
import { get } from 'lodash';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import {
  useFormData,
  UseField,
  NumericField,
  SelectField,
} from '../../../../../../../shared_imports';

import { LearnMoreLink } from '../../../learn_more_link';
import { useRolloverPath } from '../../../../constants';

import { getUnitsAriaLabelForPhase, getTimingLabelForPhase } from './util';

type PhaseWithMinAgeAction = 'warm' | 'cold' | 'delete';

interface Props {
  phase: PhaseWithMinAgeAction;
}

export const MinAgeInputField: FunctionComponent<Props> = ({ phase }): React.ReactElement => {
  const [formData] = useFormData({ watch: useRolloverPath });
  const rolloverEnabled = get(formData, useRolloverPath);

  let daysOptionLabel;
  let hoursOptionLabel;
  let minutesOptionLabel;
  let secondsOptionLabel;
  let millisecondsOptionLabel;
  let microsecondsOptionLabel;
  let nanosecondsOptionLabel;

  if (rolloverEnabled) {
    daysOptionLabel = i18n.translate(
      'xpack.indexLifecycleMgmt.editPolicy.rolloverDaysOptionLabel',
      {
        defaultMessage: 'days from rollover',
      }
    );

    hoursOptionLabel = i18n.translate(
      'xpack.indexLifecycleMgmt.editPolicy.rolloverHoursOptionLabel',
      {
        defaultMessage: 'hours from rollover',
      }
    );
    minutesOptionLabel = i18n.translate(
      'xpack.indexLifecycleMgmt.editPolicy.rolloverMinutesOptionLabel',
      {
        defaultMessage: 'minutes from rollover',
      }
    );

    secondsOptionLabel = i18n.translate(
      'xpack.indexLifecycleMgmt.editPolicy.rolloverSecondsOptionLabel',
      {
        defaultMessage: 'seconds from rollover',
      }
    );
    millisecondsOptionLabel = i18n.translate(
      'xpack.indexLifecycleMgmt.editPolicy.rolloverMilliSecondsOptionLabel',
      {
        defaultMessage: 'milliseconds from rollover',
      }
    );

    microsecondsOptionLabel = i18n.translate(
      'xpack.indexLifecycleMgmt.editPolicy.rolloverMicroSecondsOptionLabel',
      {
        defaultMessage: 'microseconds from rollover',
      }
    );

    nanosecondsOptionLabel = i18n.translate(
      'xpack.indexLifecycleMgmt.editPolicy.rolloverNanoSecondsOptionLabel',
      {
        defaultMessage: 'nanoseconds from rollover',
      }
    );
  } else {
    daysOptionLabel = i18n.translate(
      'xpack.indexLifecycleMgmt.editPolicy.creationDaysOptionLabel',
      {
        defaultMessage: 'days from index creation',
      }
    );

    hoursOptionLabel = i18n.translate(
      'xpack.indexLifecycleMgmt.editPolicy.creationHoursOptionLabel',
      {
        defaultMessage: 'hours from index creation',
      }
    );

    minutesOptionLabel = i18n.translate(
      'xpack.indexLifecycleMgmt.editPolicy.creationMinutesOptionLabel',
      {
        defaultMessage: 'minutes from index creation',
      }
    );

    secondsOptionLabel = i18n.translate(
      'xpack.indexLifecycleMgmt.editPolicy.creationSecondsOptionLabel',
      {
        defaultMessage: 'seconds from index creation',
      }
    );

    millisecondsOptionLabel = i18n.translate(
      'xpack.indexLifecycleMgmt.editPolicy.creationMilliSecondsOptionLabel',
      {
        defaultMessage: 'milliseconds from index creation',
      }
    );

    microsecondsOptionLabel = i18n.translate(
      'xpack.indexLifecycleMgmt.editPolicy.creationMicroSecondsOptionLabel',
      {
        defaultMessage: 'microseconds from index creation',
      }
    );

    nanosecondsOptionLabel = i18n.translate(
      'xpack.indexLifecycleMgmt.editPolicy.creationNanoSecondsOptionLabel',
      {
        defaultMessage: 'nanoseconds from index creation',
      }
    );
  }

  return (
    <EuiFlexGroup>
      <EuiFlexItem style={{ maxWidth: 140 }}>
        <UseField
          path={`phases.${phase}.min_age`}
          component={NumericField}
          componentProps={{
            label: getTimingLabelForPhase(phase),
            helpText: (
              <LearnMoreLink
                docPath="ilm-index-lifecycle.html#ilm-phase-transitions"
                text={
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.editPolicy.learnAboutTimingText"
                    defaultMessage="Learn about timing"
                  />
                }
              />
            ),
            euiFieldProps: {
              'data-test-subj': `${phase}-selectedMinimumAge`,
              min: 0,
            },
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem style={{ maxWidth: 236 }}>
        <UseField
          path={`_meta.${phase}.minAgeUnit`}
          component={SelectField}
          componentProps={{
            hasEmptyLabelSpace: true,
            euiFieldProps: {
              'data-test-subj': `${phase}-selectedMinimumAgeUnits`,
              'aria-label': getUnitsAriaLabelForPhase(phase),
              options: [
                {
                  value: 'd',
                  text: daysOptionLabel,
                },
                {
                  value: 'h',
                  text: hoursOptionLabel,
                },
                {
                  value: 'm',
                  text: minutesOptionLabel,
                },
                {
                  value: 's',
                  text: secondsOptionLabel,
                },
                {
                  value: 'ms',
                  text: millisecondsOptionLabel,
                },
                {
                  value: 'micros',
                  text: microsecondsOptionLabel,
                },
                {
                  value: 'nanos',
                  text: nanosecondsOptionLabel,
                },
              ],
            },
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
