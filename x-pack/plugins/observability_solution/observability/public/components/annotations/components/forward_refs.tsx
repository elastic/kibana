/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiComboBox,
  EuiComboBoxProps,
  EuiSwitch,
  EuiSwitchProps,
  EuiTextArea,
  EuiTextAreaProps,
  EuiFieldTextProps,
  EuiFieldText,
  EuiFieldNumber,
  EuiSelectProps,
  EuiSelect,
  EuiFieldNumberProps,
} from '@elastic/eui';

export const FieldText = React.forwardRef<HTMLInputElement, EuiFieldTextProps>((props, ref) => (
  <EuiFieldText data-test-subj={props['data-test-subj']} {...props} inputRef={ref} />
));

export const NumberField = React.forwardRef<HTMLInputElement, EuiFieldNumberProps>((props, ref) => (
  <EuiFieldNumber data-test-subj={props['data-test-subj']} {...props} inputRef={ref} />
));

export const TextArea = React.forwardRef<HTMLTextAreaElement, EuiTextAreaProps>((props, ref) => (
  <EuiTextArea data-test-subj="o11yTextAreaTextArea" {...props} inputRef={ref} />
));

export const ComboBox = React.forwardRef<unknown, EuiComboBoxProps<string>>((props, _ref) => (
  <EuiComboBox {...props} />
));

export const Switch = React.forwardRef<unknown, EuiSwitchProps>((props, _ref) => (
  <EuiSwitch {...props} />
));

export const Select = React.forwardRef<HTMLSelectElement, EuiSelectProps>((props, ref) => (
  <EuiSelect data-test-subj="o11ySelectSelect" {...props} inputRef={ref} />
));
