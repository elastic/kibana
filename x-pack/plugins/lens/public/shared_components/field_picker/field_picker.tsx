/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './field_picker.scss';
import React, { useRef } from 'react';
import { i18n } from '@kbn/i18n';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { EuiComboBox, EuiComboBoxProps, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FieldIcon } from '@kbn/unified-field-list-plugin/public';
import classNames from 'classnames';
import { DataType } from '../../types';
import { TruncatedLabel } from './truncated_label';
import type { FieldOptionValue, FieldOption } from './types';

export interface FieldPickerProps<T extends FieldOptionValue>
  extends EuiComboBoxProps<FieldOption<T>['value']> {
  options: Array<FieldOption<T>>;
  selectedField?: string;
  onChoose: (choice: T | undefined) => void;
  onDelete?: () => void;
  fieldIsInvalid: boolean;
  'data-test-subj'?: string;
}

const DEFAULT_COMBOBOX_WIDTH = 305;
const COMBOBOX_PADDINGS = 90;
const DEFAULT_FONT = '14px Inter';

export function FieldPicker<T extends FieldOptionValue = FieldOptionValue>({
  selectedOptions,
  options,
  onChoose,
  onDelete,
  fieldIsInvalid,
  ['data-test-subj']: dataTestSub,
  ...rest
}: FieldPickerProps<T>) {
  const styledOptions = options?.map(({ compatible, exists, ...otherAttr }) => {
    if (otherAttr.options) {
      return {
        ...otherAttr,
        compatible,
        exists,
        options: otherAttr.options.map((fieldOption) => ({
          ...fieldOption,
          className: classNames({
            'lnFieldPicker__option--incompatible': !fieldOption.compatible,
            'lnFieldPicker__option--nonExistant': !fieldOption.exists,
          }),
        })),
      };
    }
    return {
      ...otherAttr,
      compatible,
      exists,
      className: classNames({
        'lnFieldPicker__option--incompatible': !compatible,
        'lnFieldPicker__option--nonExistant': !exists,
      }),
    };
  });
  const comboBoxRef = useRef<HTMLInputElement>(null);
  const [labelProps, setLabelProps] = React.useState<{
    width: number;
    font: string;
  }>({
    width: DEFAULT_COMBOBOX_WIDTH - COMBOBOX_PADDINGS,
    font: DEFAULT_FONT,
  });

  const computeStyles = (_e: UIEvent | undefined, shouldRecomputeAll = false) => {
    if (comboBoxRef.current) {
      const current = {
        ...labelProps,
        width: comboBoxRef.current?.clientWidth - COMBOBOX_PADDINGS,
      };
      if (shouldRecomputeAll) {
        current.font = window.getComputedStyle(comboBoxRef.current).font;
      }
      setLabelProps(current);
    }
  };

  useEffectOnce(() => {
    if (comboBoxRef.current) {
      computeStyles(undefined, true);
    }
    window.addEventListener('resize', computeStyles);
  });

  return (
    <div ref={comboBoxRef}>
      <EuiComboBox
        fullWidth
        compressed
        isClearable={false}
        data-test-subj={dataTestSub ?? 'indexPattern-dimension-field'}
        placeholder={i18n.translate('xpack.lens.fieldPicker.fieldPlaceholder', {
          defaultMessage: 'Select a field',
        })}
        options={styledOptions}
        isInvalid={fieldIsInvalid}
        selectedOptions={selectedOptions}
        singleSelection={{ asPlainText: true }}
        onChange={(choices) => {
          if (choices.length === 0) {
            onDelete?.();
            return;
          }
          onChoose(choices[0].value);
        }}
        renderOption={(option, searchValue) => {
          return (
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={null}>
                <FieldIcon
                  type={(option.value as unknown as { dataType: DataType }).dataType}
                  fill="none"
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <TruncatedLabel {...labelProps} label={option.label} search={searchValue} />
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        }}
        {...rest}
      />
    </div>
  );
}
