/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { EuiFieldNumber, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSelect } from '@elastic/eui';

import { LearnMoreLink } from './learn_more_link';
import { ErrableFormRow } from './form_errors';
import { PhaseValidationErrors, propertyof } from '../../../services/policies/policy_validation';
import { PhaseWithMinAge, Phases } from '../../../services/policies/types';

function getTimingLabelForPhase(phase: keyof Phases) {
  // NOTE: Hot phase isn't necessary, because indices begin in the hot phase.
  switch (phase) {
    case 'warm':
      return i18n.translate('xpack.indexLifecycleMgmt.editPolicy.phaseWarm.minimumAgeLabel', {
        defaultMessage: 'Timing for warm phase',
      });

    case 'cold':
      return i18n.translate('xpack.indexLifecycleMgmt.editPolicy.phaseCold.minimumAgeLabel', {
        defaultMessage: 'Timing for cold phase',
      });

    case 'frozen':
      return i18n.translate('xpack.indexLifecycleMgmt.editPolicy.phaseFrozen.minimumAgeLabel', {
        defaultMessage: 'Timing for frozen phase',
      });

    case 'delete':
      return i18n.translate('xpack.indexLifecycleMgmt.editPolicy.phaseDelete.minimumAgeLabel', {
        defaultMessage: 'Timing for delete phase',
      });
  }
}

function getUnitsAriaLabelForPhase(phase: keyof Phases) {
  // NOTE: Hot phase isn't necessary, because indices begin in the hot phase.
  switch (phase) {
    case 'warm':
      return i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.phaseWarm.minimumAgeUnitsAriaLabel',
        {
          defaultMessage: 'Units for timing of warm phase',
        }
      );

    case 'cold':
      return i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.phaseCold.minimumAgeUnitsAriaLabel',
        {
          defaultMessage: 'Units for timing of cold phase',
        }
      );

    case 'delete':
      return i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.phaseDelete.minimumAgeUnitsAriaLabel',
        {
          defaultMessage: 'Units for timing of delete phase',
        }
      );
  }
}

interface Props<T extends PhaseWithMinAge> {
  rolloverEnabled: boolean;
  errors?: PhaseValidationErrors<T>;
  phase: keyof Phases & string;
  phaseData: T;
  setPhaseData: (dataKey: keyof T & string, value: string) => void;
  isShowingErrors: boolean;
}

export const MinAgeInput = <Phase extends PhaseWithMinAge>({
  rolloverEnabled,
  errors,
  phaseData,
  phase,
  setPhaseData,
  isShowingErrors,
}: React.PropsWithChildren<Props<Phase>>): React.ReactElement => {
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

  // check that these strings are valid properties
  const selectedMinimumAgeProperty = propertyof<Phase>('selectedMinimumAge');
  const selectedMinimumAgeUnitsProperty = propertyof<Phase>('selectedMinimumAgeUnits');
  return (
    <EuiFlexGroup>
      <EuiFlexItem style={{ maxWidth: 140 }}>
        <ErrableFormRow
          id={`${phase}-${selectedMinimumAgeProperty}`}
          label={getTimingLabelForPhase(phase)}
          isShowingErrors={isShowingErrors}
          errors={errors?.selectedMinimumAge}
          helpText={
            <LearnMoreLink
              docPath="ilm-index-lifecycle.html#ilm-phase-transitions"
              text={
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.learnAboutTimingText"
                  defaultMessage="Learn about timing"
                />
              }
            />
          }
        >
          <EuiFieldNumber
            id={`${phase}-${selectedMinimumAgeProperty}`}
            value={phaseData.selectedMinimumAge}
            onChange={async (e) => {
              setPhaseData(selectedMinimumAgeProperty, e.target.value);
            }}
            min={0}
          />
        </ErrableFormRow>
      </EuiFlexItem>
      <EuiFlexItem style={{ maxWidth: 236 }}>
        <EuiFormRow hasEmptyLabelSpace>
          <EuiSelect
            aria-label={getUnitsAriaLabelForPhase(phase)}
            value={phaseData.selectedMinimumAgeUnits}
            onChange={(e) => setPhaseData(selectedMinimumAgeUnitsProperty, e.target.value)}
            options={[
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
            ]}
          />
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
