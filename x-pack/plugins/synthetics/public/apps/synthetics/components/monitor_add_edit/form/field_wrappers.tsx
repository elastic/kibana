/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Ref } from 'react';
import { omit } from 'lodash';
import {
  EuiFieldText,
  EuiFieldTextProps,
  EuiSelect,
  EuiSelectProps,
  EuiFieldNumber,
  EuiFieldNumberProps,
  EuiSwitch,
  EuiSwitchProps,
  EuiButtonGroup,
  EuiButtonGroupProps,
} from '@elastic/eui';
import { SourceField, SourceFieldProps } from '../fields/source_field';
import { ComboBox as DefaultComboBox, ComboBoxProps } from '../fields/combo_box';
import { JSONEditor as DefaultJSONEditor, CodeEditorProps } from '../fields/code_editor';

export const FieldText = React.forwardRef<HTMLInputElement, EuiFieldTextProps>(
  (props, ref: Ref<HTMLInputElement>) => (
    <EuiFieldText
      {...(omit(props, ['defaultValue', 'selectedOptions']) as EuiFieldTextProps)}
      inputRef={ref}
    />
  )
);

export const Select = React.forwardRef<HTMLSelectElement, EuiSelectProps>((props, ref) => (
  <EuiSelect {...props} inputRef={ref} />
));

export const FieldNumber = React.forwardRef<HTMLInputElement, EuiFieldNumberProps>((props, ref) => (
  <EuiFieldNumber {...props} inputRef={ref} />
));

export const Switch = React.forwardRef<unknown, EuiSwitchProps>((props, _ref) => (
  <EuiSwitch {...(omit(props, ['fullWidth', 'isInvalid']) as EuiSwitchProps)} />
));

export const Source = React.forwardRef<unknown, SourceFieldProps>((props, _ref) => (
  <SourceField {...props} />
));

export const ButtonGroup = React.forwardRef<unknown, EuiButtonGroupProps>((props, _ref) => (
  <EuiButtonGroup {...(omit(props, ['isInvalid', 'fullWidth']) as EuiButtonGroupProps)} />
));

export const ComboBox = React.forwardRef<unknown, ComboBoxProps>((props, _ref) => (
  <DefaultComboBox {...props} />
));

export const JSONEditor = React.forwardRef<unknown, CodeEditorProps>((props, _ref) => (
  <DefaultJSONEditor {...props} />
));
