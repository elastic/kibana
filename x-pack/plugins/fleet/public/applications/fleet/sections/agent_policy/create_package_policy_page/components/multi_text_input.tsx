/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useState, useEffect } from 'react';
import type { FunctionComponent, ChangeEvent } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiFieldText,
  EuiButtonIcon,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  value: string[];
  onChange: (newValue: string[]) => void;
  onBlur?: () => void;
  errors?: Array<{ message: string; index?: number }>;
  isInvalid?: boolean;
  isDisabled?: boolean;
}

interface RowProps {
  index: number;
  value: string;
  onChange: (index: number, value: string) => void;
  onDelete: (index: number) => void;
  onBlur?: () => void;
  autoFocus?: boolean;
  isDisabled?: boolean;
  showDeleteButton?: boolean;
}

const Row: FunctionComponent<RowProps> = ({
  index,
  value,
  onChange,
  onDelete,
  onBlur,
  autoFocus,
  isDisabled,
  showDeleteButton,
}) => {
  const onDeleteHandler = useCallback(() => {
    onDelete(index);
  }, [onDelete, index]);

  const onChangeHandler = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onChange(index, e.target.value);
    },
    [onChange, index]
  );

  return (
    <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false}>
      <EuiFlexItem>
        <EuiFieldText
          fullWidth
          value={value}
          onChange={onChangeHandler}
          autoFocus={autoFocus}
          disabled={isDisabled}
          onBlur={onBlur}
        />
      </EuiFlexItem>
      {showDeleteButton && (
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
      )}
    </EuiFlexGroup>
  );
};

function defaultValue(value: string[]) {
  return value.length > 0 ? value : [''];
}

export const MultiTextInput: FunctionComponent<Props> = ({
  value,
  onChange,
  onBlur,
  isInvalid,
  isDisabled,
  errors,
}) => {
  const [autoFocus, setAutoFocus] = useState(false);
  const [rows, setRows] = useState(() => defaultValue(value));
  const [previousRows, setPreviousRows] = useState(rows);

  useEffect(() => {
    if (previousRows === rows) {
      return;
    }
    setPreviousRows(rows);
    if (rows[rows.length - 1] === '') {
      onChange(rows.slice(0, rows.length - 1));
    } else {
      onChange(rows);
    }
  }, [onChange, previousRows, rows]);

  const onDeleteHandler = useCallback(
    (idx: number) => {
      setRows([...rows.slice(0, idx), ...rows.slice(idx + 1)]);
    },
    [rows]
  );

  const onChangeHandler = useCallback(
    (idx: number, newValue: string) => {
      const newRows = [...rows];
      newRows[idx] = newValue;
      setRows(newRows);
    },
    [rows]
  );

  const addRowHandler = useCallback(() => {
    setAutoFocus(true);
    setRows([...rows, '']);
  }, [rows]);

  return (
    <>
      <EuiFlexGroup gutterSize="s" direction="column">
        {rows.map((row, idx) => (
          <EuiFlexItem key={idx}>
            <Row
              index={idx}
              onChange={onChangeHandler}
              onDelete={onDeleteHandler}
              onBlur={onBlur}
              value={row}
              autoFocus={autoFocus}
              isDisabled={isDisabled}
              showDeleteButton={rows.length > 1}
            />
          </EuiFlexItem>
        ))}
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
