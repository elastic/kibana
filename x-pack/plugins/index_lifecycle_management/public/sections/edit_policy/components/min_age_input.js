/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { LearnMoreLink } from '../../components';
import {
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
} from '@elastic/eui';
import {
  PHASE_ROLLOVER_MINIMUM_AGE,
  PHASE_ROLLOVER_MINIMUM_AGE_UNITS,
} from '../../../constants';
import { ErrableFormRow } from '../form_errors';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
const MinAgeInputUi = props => {
  const { rolloverEnabled, errors, phaseData, phase, setPhaseData, isShowingErrors, intl } = props;
  const fromMessage = rolloverEnabled
    ? intl.formatMessage({
      id: 'xpack.indexLifecycleMgmt.editPolicy.fromRolloverMessage',
      defaultMessage: 'from rollover',
    })
    : intl.formatMessage({
      id: 'xpack.indexLifecycleMgmt.editPolicy.fromIndexCreationMessage',
      defaultMessage: 'from index creation',
    });
  return (
    <EuiFlexGroup>
      <EuiFlexItem style={{ maxWidth: 188 }}>
        <ErrableFormRow
          id={`${phase}-${PHASE_ROLLOVER_MINIMUM_AGE}`}
          label={
            intl.formatMessage(
              {
                id: 'xpack.indexLifecycleMgmt.editPolicy.minimimAgeLabel',
                defaultMessage: 'Timing for {phase} phase',
              },
              { phase }
            )
          }
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
            onChange={async e => {
              setPhaseData(PHASE_ROLLOVER_MINIMUM_AGE, e.target.value);
            }}
            min={1}
          />
        </ErrableFormRow>
      </EuiFlexItem>
      <EuiFlexItem style={{ maxWidth: 220 }}>
        <EuiFormRow hasEmptyLabelSpace >
          <EuiSelect
            aria-label={intl.formatMessage(
              {
                id: 'xpack.indexLifecycleMgmt.editPolicy.minimimAgeUnitsAriaLabel',
                defaultMessage: '{phaseUpper} phase after units',
              },
              { phaseUpper: `${phase.charAt(0).toUpperCase()}${phase.slice(1)}` }
            )}
            value={phaseData[PHASE_ROLLOVER_MINIMUM_AGE_UNITS]}
            onChange={e => setPhaseData(PHASE_ROLLOVER_MINIMUM_AGE_UNITS, e.target.value)}
            options={[
              {
                value: 'd',
                text: intl.formatMessage(
                  {
                    id: 'xpack.indexLifecycleMgmt.editPolicy.daysLabel',
                    defaultMessage: 'days {fromMessage}',
                  },
                  {
                    fromMessage,
                  }
                ),
              },
              {
                value: 'h',
                text: intl.formatMessage(
                  {
                    id: 'xpack.indexLifecycleMgmt.editPolicy.hoursLabel',
                    defaultMessage: 'hours {fromMessage}',
                  },
                  {
                    fromMessage,
                  }
                ),
              },
            ]}
          />
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
export const MinAgeInput = injectI18n(MinAgeInputUi);
