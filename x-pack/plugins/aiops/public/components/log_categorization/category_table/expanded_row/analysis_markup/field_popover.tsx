/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useCallback, useEffect } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPopover,
  EuiPopoverTitle,
} from '@elastic/eui';
import { FieldIcon } from '@kbn/react-field';
import { cloneDeep, isEqual } from 'lodash';
import { Field } from '../fields_table';

interface Props {
  field: Field;
  value: string;
  togglePopover: (index: number | null) => void;
  isPopoverOpen: number | null;
  index: number;
  isNewField: boolean;
  updateField: (field: Field) => void;
  addField?: (field: Field) => void;
}
export const FieldPopover: FC<Props> = ({
  field: fieldIn,
  value,
  index,
  isPopoverOpen,
  togglePopover,
  updateField,
  addField,
  isNewField,
  children,
}) => {
  const [field, setField] = useState<Field | null>(null);
  const [originalField, setOriginalField] = useState<Field | null>(null);

  useEffect(() => {
    setOriginalField(cloneDeep(fieldIn));
    setField(fieldIn);
  }, [fieldIn]);

  const onChange = useCallback(
    (newName: string) => {
      if (field === null) {
        return;
      }
      setField({
        ...field,
        name: newName,
      });
    },
    [field]
  );

  const deleteField = useCallback(() => {
    if (field === null) {
      return;
    }
    updateField({ ...field, enabled: false });
    togglePopover(null);
  }, [field, togglePopover, updateField]);

  const closePopover = useCallback(() => {
    if (field === null) {
      return;
    }
    if (field.name === '') {
      togglePopover(null);
      return;
    }

    if (isNewField && addField !== undefined) {
      addField(field);
    } else {
      if (isEqual(field, originalField) === false) {
        updateField(field);
      }
    }
    togglePopover(null);
  }, [addField, field, isNewField, originalField, togglePopover, updateField]);

  if (field === null) {
    return null;
  }

  return (
    <EuiPopover
      isOpen={isPopoverOpen === index}
      closePopover={() => closePopover()}
      anchorPosition="downCenter"
      button={
        <EuiButtonEmpty
          onClick={() => togglePopover(index)}
          flush="both"
          css={{
            height: 'auto',
            fontSize: '12px',
            '.euiButtonEmpty__content': { height: 'auto' },
          }}
        >
          {children}
        </EuiButtonEmpty>
      }
    >
      <EuiPopoverTitle>
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={false}>
            <FieldIcon
              type={field.type}
              style={{ marginRight: '2px', marginTop: '1px', border: '1px solid #a89752' }}
            />
          </EuiFlexItem>
          <EuiFlexItem>{value}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            {isNewField ? null : (
              <EuiButtonIcon
                aria-label="Delete field"
                size="xs"
                iconType="trash"
                color="danger"
                onClick={() => deleteField()}
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverTitle>
      <EuiForm component="form" onSubmit={() => closePopover()}>
        <EuiFormRow label="Field name">
          <EuiFieldText
            compressed={true}
            value={field.name}
            onChange={(e) => onChange(e.target.value)}
          />
        </EuiFormRow>
      </EuiForm>
    </EuiPopover>
  );
};
