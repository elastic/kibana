/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useCallback, useState } from 'react';
import type { FunctionComponent, ChangeEvent } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiFieldText,
  EuiButtonIcon,
  EuiSpacer,
  EuiFormErrorText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

interface Props {
  value: string[];
  onChange: (newValue: string[]) => void;
  errors?: Array<{ message: string; index?: number }>;
  isInvalid?: boolean;
  isDisabled?: boolean;
}

interface RowProps {
  index: number;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onDelete: (index: number) => void;
  errors?: string[];
  autoFocus?: boolean;
  isDisabled?: boolean;
}

function displayErrors(errors?: string[]) {
  return errors?.length
    ? errors.map((error, errorIndex) => (
        <EuiFormErrorText key={errorIndex}>{error}</EuiFormErrorText>
      ))
    : null;
}

const Row: FunctionComponent<RowProps> = React.memo(
  ({ index, value, onChange, onDelete, autoFocus, errors, isDisabled }) => {
    const onDeleteHandler = useCallback(() => {
      onDelete(index);
    }, [onDelete, index]);

    const isInvalid = (errors?.length ?? 0) > 0;

    return (
      <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false}>
        <EuiFlexItem>
          <EuiFieldText
            fullWidth
            value={value}
            onChange={onChange}
            autoFocus={autoFocus}
            isInvalid={isInvalid}
            disabled={isDisabled}
          />
          {displayErrors(errors)}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            color="text"
            onClick={onDeleteHandler}
            iconType="cross"
            disabled={isDisabled}
            aria-label={i18n.translate('xpack.fleet.multiTextInput.deleteRowButton', {
              defaultMessage: 'Delete row',
            })}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

function defaultValue(value: string[]) {
  return value.length > 0 ? value : [''];
}

export const MultiTextInput: FunctionComponent<Props> = ({
  value,
  onChange,
  isInvalid,
  isDisabled,
  errors,
}) => {
  const [autoFocus, setAutoFocus] = useState(false);
  const rows = useMemo(() => {
    return defaultValue(value).map((val, idx) => ({
      value: val,
      onChange: (e: ChangeEvent<HTMLInputElement>) => {
        const newValue = [...value];
        newValue[idx] = e.target.value;

        onChange(newValue);
      },
    }));
  }, [value, onChange]);

  const onDelete = useCallback(
    (idx: number) => {
      onChange([...value.slice(0, idx), ...value.slice(idx + 1)]);
    },
    [value, onChange]
  );

  const addRowHandler = useCallback(() => {
    setAutoFocus(true);
    onChange([...defaultValue(value), '']);
  }, [value, onChange]);

  const globalErrors = useMemo(() => {
    return errors && errors.filter((err) => err.index === undefined).map(({ message }) => message);
  }, [errors]);

  const indexedErrors = useMemo(() => {
    if (!errors) {
      return [];
    }
    return errors.reduce((acc, err) => {
      if (err.index === undefined) {
        return acc;
      }

      if (!acc[err.index]) {
        acc[err.index] = [];
      }

      acc[err.index].push(err.message);

      return acc;
    }, [] as string[][]);
  }, [errors]);

  return (
    <>
      <EuiFlexGroup gutterSize="s" direction="column">
        {rows.map((row, idx) => (
          <EuiFlexItem key={idx}>
            {rows.length > 1 ? (
              <Row
                index={idx}
                onChange={row.onChange}
                onDelete={onDelete}
                value={row.value}
                autoFocus={autoFocus}
                errors={indexedErrors[idx]}
                isDisabled={isDisabled}
              />
            ) : (
              <>
                <EuiFieldText
                  disabled={isDisabled}
                  fullWidth
                  value={row.value}
                  onChange={row.onChange}
                  isInvalid={!!indexedErrors[idx]}
                />
                {displayErrors(indexedErrors[idx])}
              </>
            )}
          </EuiFlexItem>
        ))}
        {displayErrors(globalErrors)}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiButtonEmpty
        disabled={isDisabled}
        size="xs"
        flush="left"
        iconType="plusInCircle"
        onClick={addRowHandler}
      >
        <FormattedMessage id="xpack.fleet.multiTextInput.addRow" defaultMessage="Add row" />
      </EuiButtonEmpty>
    </>
  );
};
