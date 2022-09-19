/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';

import { EuiFormRow, EuiSuperSelect, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { useController } from 'react-hook-form';
import { FormattedMessage } from '@kbn/i18n-react';
import deepEqual from 'fast-deep-equal';

const LOGGING_FIELD_OPTIONS = [
  {
    value: 'snapshot',
    inputDisplay: (
      <FormattedMessage
        id="xpack.osquery.pack.queryFlyoutForm.loggingField.snapshotValueLabel"
        defaultMessage="Snapshot"
      />
    ),
  },
  {
    value: 'differential',
    inputDisplay: (
      <FormattedMessage
        id="xpack.osquery.pack.queryFlyoutForm.loggingField.differentialValueLabel"
        defaultMessage="Diffential"
      />
    ),
  },
  {
    value: 'removed',
    inputDisplay: (
      <FormattedMessage
        id="xpack.osquery.pack.queryFlyoutForm.loggingField.differentialIgnoreRemovalsValueLabel"
        defaultMessage="Differential (Ignore removals)"
      />
    ),
  },
];

interface LoggingFieldProps {
  euiFieldProps?: Record<string, unknown>;
}

const LoggingFieldComponent: React.FC<LoggingFieldProps> = ({ euiFieldProps = {} }) => {
  const [selectedOption, setSelectedOption] = useState(LOGGING_FIELD_OPTIONS[0].value);
  const {
    field: { onChange: onSnapshotChange, value: snapshotValue },
  } = useController({
    name: 'snapshot',
    defaultValue: true,
  });

  const {
    field: { onChange: onRemovedChange, value: removedValue },
  } = useController({
    name: 'removed',
    defaultValue: false,
  });

  const handleChange = useCallback(
    (newValue) => {
      if (newValue === LOGGING_FIELD_OPTIONS[0].value) {
        onSnapshotChange(true);
        onRemovedChange(false);
      }

      if (newValue === LOGGING_FIELD_OPTIONS[1].value) {
        onSnapshotChange(false);
        onRemovedChange(true);
      }

      if (newValue === LOGGING_FIELD_OPTIONS[2].value) {
        onSnapshotChange(false);
        onRemovedChange(false);
      }
    },
    [onRemovedChange, onSnapshotChange]
  );

  useEffect(() => {
    setSelectedOption(() => {
      if (snapshotValue) {
        return LOGGING_FIELD_OPTIONS[0].value;
      }

      if (!snapshotValue && removedValue) {
        return LOGGING_FIELD_OPTIONS[1].value;
      }

      if (!snapshotValue && !removedValue) {
        return LOGGING_FIELD_OPTIONS[2].value;
      }

      return LOGGING_FIELD_OPTIONS[0].value;
    });
  }, [removedValue, snapshotValue]);

  return (
    <EuiFormRow
      label={
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={false}>
            <FormattedMessage
              id="xpack.osquery.pack.queryFlyoutForm.loggingFieldLabel"
              defaultMessage="Logging"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      labelAppend={
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.osquery.queryFlyoutForm.fieldOptionalLabel"
              defaultMessage="(optional)"
            />
          </EuiText>
        </EuiFlexItem>
      }
      fullWidth
    >
      <EuiSuperSelect
        options={LOGGING_FIELD_OPTIONS}
        fullWidth
        valueOfSelected={selectedOption}
        onChange={handleChange}
      />
    </EuiFormRow>
  );
};

export const LoggingField = React.memo(LoggingFieldComponent, deepEqual);
