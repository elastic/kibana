/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';
import deepEqual from 'fast-deep-equal';
import { useController } from 'react-hook-form';
import type { EuiFieldNumberProps } from '@elastic/eui';
import {
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { QUERY_TIMEOUT } from '../../common/constants';

const timeoutFieldValidations = {
  min: {
    message: i18n.translate('xpack.osquery.pack.queryFlyoutForm.timeoutFieldMinNumberError', {
      defaultMessage: 'Timeout value must be greater than {than} seconds.',
      values: { than: QUERY_TIMEOUT.DEFAULT },
    }),
    value: QUERY_TIMEOUT.DEFAULT,
  },
  max: {
    message: i18n.translate('xpack.osquery.pack.queryFlyoutForm.timeoutFieldMaxNumberError', {
      defaultMessage: 'Timeout value must be lower than {than} seconds.',
      values: { than: QUERY_TIMEOUT.MAX },
    }),
    value: QUERY_TIMEOUT.MAX,
  },
};

interface TimeoutFieldProps {
  euiFieldProps?: Record<string, unknown>;
}

const TimeoutFieldComponent = ({ euiFieldProps }: TimeoutFieldProps) => {
  const {
    field: { onChange, value },
    fieldState: { error },
  } = useController({
    name: 'timeout',
    defaultValue: QUERY_TIMEOUT.DEFAULT,
    rules: {
      ...timeoutFieldValidations,
    },
  });
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const numberValue = e.target.valueAsNumber ? e.target.valueAsNumber : 0;
      onChange(numberValue);
    },
    [onChange]
  );
  const hasError = useMemo(() => !!error?.message, [error?.message]);

  return (
    <EuiFormRow
      label={
        <EuiFlexGroup gutterSize="xs" alignItems="flexEnd">
          <EuiFlexItem grow={false}>
            <FormattedMessage id="xpack.osquery.liveQuery.timeout" defaultMessage="Timeout" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIconTip
              content={i18n.translate('xpack.osquery.liveQuery.timeoutHint', {
                defaultMessage: 'Maximum time to wait for query results, default is 60 seconds.',
              })}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      fullWidth
      error={error?.message}
      isInvalid={hasError}
      labelAppend={
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.osquery.osquery.liveQuery.timeoutFieldOptionalLabel"
              defaultMessage="(optional)"
            />
          </EuiText>
        </EuiFlexItem>
      }
    >
      <EuiFieldNumber
        isInvalid={hasError}
        value={value as EuiFieldNumberProps['value']}
        onChange={handleChange}
        fullWidth
        type="number"
        data-test-subj="timeout-input"
        name="timeout"
        min={QUERY_TIMEOUT.DEFAULT}
        max={QUERY_TIMEOUT.MAX}
        defaultValue={QUERY_TIMEOUT.DEFAULT}
        step={1}
        append="seconds"
        {...euiFieldProps}
      />
    </EuiFormRow>
  );
};

export const TimeoutField = React.memo(TimeoutFieldComponent, deepEqual);
