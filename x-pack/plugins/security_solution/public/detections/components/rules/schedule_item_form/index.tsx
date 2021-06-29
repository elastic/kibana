/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldNumber,
  EuiFormRow,
  EuiSelect,
  EuiFormControlLayout,
} from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import { FieldHook, getFieldValidityAndErrorMessage } from '../../../../shared_imports';

import * as I18n from './translations';

interface ScheduleItemProps {
  field: FieldHook<string>;
  dataTestSubj: string;
  idAria: string;
  isDisabled: boolean;
  minimumValue?: number;
}

const timeTypeOptions = [
  { value: 's', text: I18n.SECONDS },
  { value: 'm', text: I18n.MINUTES },
  { value: 'h', text: I18n.HOURS },
];

// move optional label to the end of input
const StyledLabelAppend = styled(EuiFlexItem)`
  &.euiFlexItem.euiFlexItem--flexGrowZero {
    margin-left: 31px;
  }
`;

const StyledEuiFormRow = styled(EuiFormRow)`
  max-width: none;

  .euiFormControlLayout {
    max-width: 200px !important;
  }

  .euiFormControlLayout__childrenWrapper > *:first-child {
    box-shadow: none;
    height: 38px;
  }

  .euiFormControlLayout:not(:first-child) {
    border-left: 1px solid ${({ theme }) => theme.eui.euiColorLightShade};
  }
`;

const MyEuiSelect = styled(EuiSelect)`
  width: auto;
`;

const getNumberFromUserInput = (input: string, defaultValue = 0): number => {
  const number = parseInt(input, 10);
  if (Number.isNaN(number)) {
    return defaultValue;
  } else {
    return Math.min(number, Number.MAX_SAFE_INTEGER);
  }
};

export const ScheduleItem = ({
  dataTestSubj,
  field,
  idAria,
  isDisabled,
  minimumValue = 0,
}: ScheduleItemProps) => {
  const [timeType, setTimeType] = useState('s');
  const [timeVal, setTimeVal] = useState<number>(0);
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const { value, setValue } = field;

  const onChangeTimeType = useCallback(
    (e) => {
      setTimeType(e.target.value);
      setValue(`${timeVal}${e.target.value}`);
    },
    [setValue, timeVal]
  );

  const onChangeTimeVal = useCallback(
    (e) => {
      const sanitizedValue = getNumberFromUserInput(e.target.value, minimumValue);
      setTimeVal(sanitizedValue);
      setValue(`${sanitizedValue}${timeType}`);
    },
    [minimumValue, setValue, timeType]
  );

  useEffect(() => {
    if (value !== `${timeVal}${timeType}`) {
      const filterTimeVal = value.match(/\d+/g);
      const filterTimeType = value.match(/[a-zA-Z]+/g);
      if (
        !isEmpty(filterTimeVal) &&
        filterTimeVal != null &&
        !isNaN(Number(filterTimeVal[0])) &&
        Number(filterTimeVal[0]) !== Number(timeVal)
      ) {
        setTimeVal(Number(filterTimeVal[0]));
      }
      if (
        !isEmpty(filterTimeType) &&
        filterTimeType != null &&
        ['s', 'm', 'h'].includes(filterTimeType[0]) &&
        filterTimeType[0] !== timeType
      ) {
        setTimeType(filterTimeType[0]);
      }
    }
  }, [timeType, timeVal, value]);

  // EUI missing some props
  const rest = { disabled: isDisabled };
  const label = useMemo(
    () => (
      <EuiFlexGroup gutterSize="s" justifyContent="flexStart" alignItems="center">
        <EuiFlexItem grow={false} component="span">
          {field.label}
        </EuiFlexItem>
        <StyledLabelAppend grow={false} component="span">
          {field.labelAppend}
        </StyledLabelAppend>
      </EuiFlexGroup>
    ),
    [field.label, field.labelAppend]
  );

  return (
    <StyledEuiFormRow
      label={label}
      helpText={field.helpText}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth={false}
      data-test-subj={dataTestSubj}
      describedByIds={idAria ? [idAria] : undefined}
    >
      <EuiFormControlLayout
        append={
          <MyEuiSelect
            fullWidth={false}
            options={timeTypeOptions}
            onChange={onChangeTimeType}
            value={timeType}
            data-test-subj="timeType"
            {...rest}
          />
        }
      >
        <EuiFieldNumber
          fullWidth
          min={minimumValue}
          max={Number.MAX_SAFE_INTEGER}
          onChange={onChangeTimeVal}
          value={timeVal}
          data-test-subj="interval"
          {...rest}
        />
      </EuiFormControlLayout>
    </StyledEuiFormRow>
  );
};
