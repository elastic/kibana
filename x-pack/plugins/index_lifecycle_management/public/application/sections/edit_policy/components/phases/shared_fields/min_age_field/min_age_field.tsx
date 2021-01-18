/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import {
  EuiFieldNumber,
  EuiFieldNumberProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiText,
} from '@elastic/eui';

import { UseField, getFieldValidityAndErrorMessage } from '../../../../../../../shared_imports';

import { getUnitsAriaLabelForPhase, getTimingLabelForPhase } from './util';

type PhaseWithMinAgeAction = 'warm' | 'cold' | 'delete';

interface Props {
  phase: PhaseWithMinAgeAction;
}

export const MinAgeField: FunctionComponent<Props> = ({ phase }): React.ReactElement => {
  const daysOptionLabel = i18n.translate('xpack.indexLifecycleMgmt.editPolicy.daysOptionLabel', {
    defaultMessage: 'days',
  });

  const hoursOptionLabel = i18n.translate('xpack.indexLifecycleMgmt.editPolicy.hoursOptionLabel', {
    defaultMessage: 'hours',
  });
  const minutesOptionLabel = i18n.translate(
    'xpack.indexLifecycleMgmt.editPolicy.minutesOptionLabel',
    {
      defaultMessage: 'minutes',
    }
  );

  const secondsOptionLabel = i18n.translate(
    'xpack.indexLifecycleMgmt.editPolicy.secondsOptionLabel',
    {
      defaultMessage: 'seconds',
    }
  );
  const millisecondsOptionLabel = i18n.translate(
    'xpack.indexLifecycleMgmt.editPolicy.milliSecondsOptionLabel',
    {
      defaultMessage: 'milliseconds',
    }
  );

  const microsecondsOptionLabel = i18n.translate(
    'xpack.indexLifecycleMgmt.editPolicy.microSecondsOptionLabel',
    {
      defaultMessage: 'microseconds',
    }
  );

  const nanosecondsOptionLabel = i18n.translate(
    'xpack.indexLifecycleMgmt.editPolicy.nanoSecondsOptionLabel',
    {
      defaultMessage: 'nanoseconds',
    }
  );

  return (
    <UseField path={`phases.${phase}.min_age`}>
      {(field) => {
        const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
        return (
          <EuiFormRow fullWidth isInvalid={isInvalid} error={errorMessage}>
            <EuiFlexGroup gutterSize={'xs'} alignItems={'center'} wrap>
              <EuiFlexItem grow={false}>
                <EuiText size={'xs'}>Move data into phase when:</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize={'xs'} alignItems={'center'}>
                  <EuiFlexItem grow={false}>
                    <EuiFieldNumber
                      compressed
                      style={{ maxWidth: 50 }}
                      aria-label={getTimingLabelForPhase(phase)}
                      isInvalid={isInvalid}
                      value={field.value as EuiFieldNumberProps['value']}
                      onChange={field.onChange}
                      isLoading={field.isValidating}
                      data-test-subj={`${phase}-selectedMinimumAge`}
                      min={0}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <UseField path={`_meta.${phase}.minAgeUnit`}>
                      {(unitField) => {
                        const { isInvalid: isUnitFieldInvalid } = getFieldValidityAndErrorMessage(
                          unitField
                        );
                        return (
                          <EuiSelect
                            compressed
                            style={{ maxWidth: 80 }}
                            value={unitField.value as string}
                            onChange={(e) => {
                              unitField.setValue(e.target.value);
                            }}
                            hasNoInitialSelection={true}
                            isInvalid={isUnitFieldInvalid}
                            append={'old'}
                            data-test-subj={`${phase}-selectedMinimumAgeUnits`}
                            aria-label={getUnitsAriaLabelForPhase(phase)}
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
                        );
                      }}
                    </UseField>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>
        );
      }}
    </UseField>
  );
};
