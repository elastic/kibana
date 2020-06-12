/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { EuiFieldNumber, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSelect } from '@elastic/eui';

import {
  PHASE_ROLLOVER_MINIMUM_AGE,
  PHASE_ROLLOVER_MINIMUM_AGE_UNITS,
  PHASE_WARM,
  PHASE_COLD,
  PHASE_DELETE,
} from '../../../constants';
import { LearnMoreLink } from '../../components';
import { ErrableFormRow } from '../form_errors';

function getTimingLabelForPhase(phase) {
  // NOTE: Hot phase isn't necessary, because indices begin in the hot phase.
  switch (phase) {
    case PHASE_WARM:
      return i18n.translate('xpack.indexLifecycleMgmt.editPolicy.phaseWarm.minimumAgeLabel', {
        defaultMessage: 'Timing for warm phase',
      });

    case PHASE_COLD:
      return i18n.translate('xpack.indexLifecycleMgmt.editPolicy.phaseCold.minimumAgeLabel', {
        defaultMessage: 'Timing for cold phase',
      });

    case PHASE_DELETE:
      return i18n.translate('xpack.indexLifecycleMgmt.editPolicy.phaseDelete.minimumAgeLabel', {
        defaultMessage: 'Timing for delete phase',
      });
  }
}

function getUnitsAriaLabelForPhase(phase) {
  // NOTE: Hot phase isn't necessary, because indices begin in the hot phase.
  switch (phase) {
    case PHASE_WARM:
      return i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.phaseWarm.minimumAgeUnitsAriaLabel',
        {
          defaultMessage: 'Units for timing of warm phase',
        }
      );

    case PHASE_COLD:
      return i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.phaseCold.minimumAgeUnitsAriaLabel',
        {
          defaultMessage: 'Units for timing of cold phase',
        }
      );

    case PHASE_DELETE:
      return i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.phaseDelete.minimumAgeUnitsAriaLabel',
        {
          defaultMessage: 'Units for timing of delete phase',
        }
      );
  }
}

export const MinAgeInput = (props) => {
  const { rolloverEnabled, errors, phaseData, phase, setPhaseData, isShowingErrors } = props;

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
      <EuiFlexItem style={{ maxWidth: 188 }}>
        <ErrableFormRow
          id={`${phase}-${PHASE_ROLLOVER_MINIMUM_AGE}`}
          label={getTimingLabelForPhase(phase)}
          errorKey={PHASE_ROLLOVER_MINIMUM_AGE}
          isShowingErrors={isShowingErrors}
          errors={errors}
          helpText={
            <LearnMoreLink
              docPath="_timing.html"
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
            id={`${phase}-${PHASE_ROLLOVER_MINIMUM_AGE}`}
            value={phaseData[PHASE_ROLLOVER_MINIMUM_AGE]}
            onChange={async (e) => {
              setPhaseData(PHASE_ROLLOVER_MINIMUM_AGE, e.target.value);
            }}
            min={0}
          />
        </ErrableFormRow>
      </EuiFlexItem>
      <EuiFlexItem style={{ maxWidth: 220 }}>
        <EuiFormRow hasEmptyLabelSpace>
          <EuiSelect
            aria-label={getUnitsAriaLabelForPhase(phase)}
            value={phaseData[PHASE_ROLLOVER_MINIMUM_AGE_UNITS]}
            onChange={(e) => setPhaseData(PHASE_ROLLOVER_MINIMUM_AGE_UNITS, e.target.value)}
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
