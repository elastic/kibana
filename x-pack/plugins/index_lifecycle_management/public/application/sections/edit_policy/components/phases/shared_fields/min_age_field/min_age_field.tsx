/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

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

const i18nTexts = {
  daysOptionLabel: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.daysOptionLabel', {
    defaultMessage: 'days',
  }),

  hoursOptionLabel: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.hoursOptionLabel', {
    defaultMessage: 'hours',
  }),
  minutesOptionLabel: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.minutesOptionLabel', {
    defaultMessage: 'minutes',
  }),

  secondsOptionLabel: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.secondsOptionLabel', {
    defaultMessage: 'seconds',
  }),
  millisecondsOptionLabel: i18n.translate(
    'xpack.indexLifecycleMgmt.editPolicy.milliSecondsOptionLabel',
    {
      defaultMessage: 'milliseconds',
    }
  ),

  microsecondsOptionLabel: i18n.translate(
    'xpack.indexLifecycleMgmt.editPolicy.microSecondsOptionLabel',
    {
      defaultMessage: 'microseconds',
    }
  ),

  nanosecondsOptionLabel: i18n.translate(
    'xpack.indexLifecycleMgmt.editPolicy.nanoSecondsOptionLabel',
    {
      defaultMessage: 'nanoseconds',
    }
  ),
};

interface Props {
  phase: PhaseWithMinAgeAction;
}

export const MinAgeField: FunctionComponent<Props> = ({ phase }): React.ReactElement => {
  return (
    <UseField path={`phases.${phase}.min_age`}>
      {(field) => {
        const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
        return (
          <EuiFormRow fullWidth isInvalid={isInvalid} error={errorMessage}>
            <EuiFlexGroup gutterSize={'s'} alignItems={'center'} justifyContent={'spaceBetween'}>
              <EuiFlexItem grow={false}>
                <EuiText className={'eui-textNoWrap'} size={'xs'}>
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.editPolicy.minimumAge.minimumAgeFieldLabel"
                    defaultMessage="Move data into phase when:"
                  />
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={true}>
                <EuiFlexGroup gutterSize={'s'}>
                  <EuiFlexItem grow={false}>
                    <EuiFieldNumber
                      style={{ minWidth: 50 }}
                      compressed
                      aria-label={getTimingLabelForPhase(phase)}
                      isInvalid={isInvalid}
                      value={field.value as EuiFieldNumberProps['value']}
                      onChange={field.onChange}
                      isLoading={field.isValidating}
                      data-test-subj={`${phase}-selectedMinimumAge`}
                      min={0}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={true} style={{ minWidth: 165 }}>
                    <UseField path={`_meta.${phase}.minAgeUnit`}>
                      {(unitField) => {
                        const { isInvalid: isUnitFieldInvalid } = getFieldValidityAndErrorMessage(
                          unitField
                        );
                        return (
                          <EuiSelect
                            compressed
                            value={unitField.value as string}
                            onChange={(e) => {
                              unitField.setValue(e.target.value);
                            }}
                            isInvalid={isUnitFieldInvalid}
                            append={'old'}
                            data-test-subj={`${phase}-selectedMinimumAgeUnits`}
                            aria-label={getUnitsAriaLabelForPhase(phase)}
                            options={[
                              {
                                value: 'd',
                                text: i18nTexts.daysOptionLabel,
                              },
                              {
                                value: 'h',
                                text: i18nTexts.hoursOptionLabel,
                              },
                              {
                                value: 'm',
                                text: i18nTexts.minutesOptionLabel,
                              },
                              {
                                value: 's',
                                text: i18nTexts.secondsOptionLabel,
                              },
                              {
                                value: 'ms',
                                text: i18nTexts.millisecondsOptionLabel,
                              },
                              {
                                value: 'micros',
                                text: i18nTexts.microsecondsOptionLabel,
                              },
                              {
                                value: 'nanos',
                                text: i18nTexts.nanosecondsOptionLabel,
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
