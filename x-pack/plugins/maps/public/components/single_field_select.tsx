/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React from 'react';

import {
  EuiComboBox,
  EuiComboBoxProps,
  EuiComboBoxOptionOption,
  EuiHighlight,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
} from '@elastic/eui';
import { FieldIcon } from '@kbn/react-field';
import { DataViewField } from '@kbn/data-views-plugin/public';
import { css } from '@emotion/react';

function fieldsToOptions(
  fields?: DataViewField[],
  isFieldDisabled?: (field: DataViewField) => boolean,
  getFieldDisabledReason?: (field: DataViewField) => string | null
): Array<EuiComboBoxOptionOption<DataViewField>> {
  if (!fields) {
    return [];
  }

  return fields
    .map((field) => {
      const option: EuiComboBoxOptionOption<DataViewField> = {
        value: field,
        label: field.displayName ? field.displayName : field.name,
      };
      if (isFieldDisabled && isFieldDisabled(field)) {
        option.disabled = true;
        const disabledReason = getFieldDisabledReason
          ? getFieldDisabledReason(option.value!)
          : null;

        if (disabledReason) {
          option.prepend = (
            <EuiToolTip position="left" content={disabledReason}>
              <div
                css={css`
                  position: absolute;
                  width: 100%;
                  background-color: rgba(255, 0, 0, 0.3);
                  top: 0;
                  bottom: 0;
                  left: 0;
                  right: 0;
                `}
              />
            </EuiToolTip>
          );
        }
      }

      return option;
    })
    .sort((a, b) => {
      return a.label.toLowerCase().localeCompare(b.label.toLowerCase());
    });
}

export type Props = Omit<
  EuiComboBoxProps<DataViewField>,
  'isDisabled' | 'onChange' | 'options' | 'renderOption' | 'selectedOptions' | 'singleSelection'
> & {
  fields?: DataViewField[];
  onChange: (fieldName?: string) => void;
  value: string | null; // index pattern field name
  isFieldDisabled?: (field: DataViewField) => boolean;
  getFieldDisabledReason?: (field: DataViewField) => string | null;
};

export function SingleFieldSelect({
  fields,
  getFieldDisabledReason,
  isFieldDisabled,
  onChange,
  value,
  ...rest
}: Props) {
  const onSelection = (selectedOptions: Array<EuiComboBoxOptionOption<DataViewField>>) => {
    onChange(_.get(selectedOptions, '0.value.name'));
  };

  const selectedOptions: Array<EuiComboBoxOptionOption<DataViewField>> = [];
  if (value && fields) {
    const selectedField = fields.find((field: DataViewField) => {
      return field.name === value;
    });
    if (selectedField) {
      selectedOptions.push({
        value: selectedField,
        label: selectedField.displayName ? selectedField.displayName : selectedField.name,
      });
    }
  }
  const optt = fieldsToOptions(fields, isFieldDisabled, getFieldDisabledReason);
  if (optt.length) {
    optt[0].disabled = true;
  }
  const maxLabelLength =
    fields?.reduce<number>((prev, curr) => {
      return prev > curr.displayName.length ? prev : curr.displayName.length;
    }, 20) || 20;

  const panelMinWidth = getPanelMinWidth(maxLabelLength);
  return (
    <EuiComboBox
      singleSelection={true}
      options={optt}
      selectedOptions={selectedOptions}
      onChange={onSelection}
      isDisabled={!fields || fields.length === 0}
      truncationProps={MIDDLE_TRUNCATION_PROPS}
      inputPopoverProps={{ panelMinWidth }}
      {...rest}
    />
  );
}
const MIDDLE_TRUNCATION_PROPS = { truncation: 'middle' as const };
const MINIMUM_POPOVER_WIDTH = 300;
const MINIMUM_POPOVER_WIDTH_CHAR_COUNT = 28;
const AVERAGE_CHAR_WIDTH = 7;
const MAXIMUM_POPOVER_WIDTH_CHAR_COUNT = 60;
const MAXIMUM_POPOVER_WIDTH = 550; // fitting 60 characters

function getPanelMinWidth(labelLength: number) {
  if (labelLength > MAXIMUM_POPOVER_WIDTH_CHAR_COUNT) {
    return MAXIMUM_POPOVER_WIDTH;
  }
  if (labelLength > MINIMUM_POPOVER_WIDTH_CHAR_COUNT) {
    const overflownChars = labelLength - MINIMUM_POPOVER_WIDTH_CHAR_COUNT;
    return MINIMUM_POPOVER_WIDTH + overflownChars * AVERAGE_CHAR_WIDTH;
  }
  return MINIMUM_POPOVER_WIDTH;
}
