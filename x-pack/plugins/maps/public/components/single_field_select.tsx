/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React from 'react';
import { css } from '@emotion/react';
import { EuiComboBox, EuiComboBoxProps, EuiComboBoxOptionOption, EuiToolTip } from '@elastic/eui';
import { FieldIcon } from '@kbn/react-field';
import { DataViewField } from '@kbn/data-views-plugin/public';
import { calculateWidthFromEntries } from '@kbn/calculate-width-from-char-count';
import { MIDDLE_TRUNCATION_PROPS } from '../../common/constants';

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
      const FieldTypeIcon = field.type ? (
        <FieldIcon type={field.type} fill="none" className="eui-alignMiddle" />
      ) : null;
      const option: EuiComboBoxOptionOption<DataViewField> = {
        value: field,
        label: field.displayName ? field.displayName : field.name,
        prepend: FieldTypeIcon,
      };
      if (isFieldDisabled && isFieldDisabled(field)) {
        option.disabled = true;

        const disabledReason =
          option.disabled && getFieldDisabledReason ? getFieldDisabledReason(option.value!) : null;

        if (disabledReason) {
          option.prepend = (
            <>
              {FieldTypeIcon}
              <EuiToolTip
                position="left"
                content={disabledReason}
                anchorProps={{
                  css: css`
                    position: absolute;
                    width: 100%;
                    top: 0;
                    bottom: 0;
                    left: 0;
                    right: 0;
                  `,
                }}
              >
                <div />
              </EuiToolTip>
            </>
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

  const options = fieldsToOptions(fields, isFieldDisabled, getFieldDisabledReason);

  const panelMinWidth = calculateWidthFromEntries(options, ['label']);

  return (
    <EuiComboBox
      singleSelection={true}
      options={options}
      selectedOptions={selectedOptions}
      onChange={onSelection}
      isDisabled={!fields || fields.length === 0}
      truncationProps={MIDDLE_TRUNCATION_PROPS}
      inputPopoverProps={{ panelMinWidth }}
      {...rest}
    />
  );
}
