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
  EuiFieldPassword,
  EuiFieldPasswordProps,
  EuiCheckbox,
  EuiCheckboxProps,
  EuiSwitch,
  EuiSwitchProps,
  EuiButtonGroup,
  EuiButtonGroupProps,
  EuiComboBox,
  EuiComboBoxProps,
} from '@elastic/eui';
import { SourceField, SourceFieldProps } from '../fields/source_field';
import {
  FormattedComboBox as DefaultFormattedComboBox,
  FormattedComboBoxProps,
} from '../fields/combo_box';
import { JSONEditor as DefaultJSONEditor, CodeEditorProps } from '../fields/code_editor';
import {
  MonitorTypeRadioGroup as DefaultMonitorTypeRadioGroup,
  MonitorTypeRadioGroupProps,
} from '../fields/monitor_type_radio_group';
import { HeaderField as DefaultHeaderField, HeaderFieldProps } from '../fields/header_field';
import {
  RequestBodyField as DefaultRequestBodyField,
  RequestBodyFieldProps,
} from '../fields/request_body_field';
import {
  ResponseBodyIndexField as DefaultResponseBodyIndexField,
  ResponseBodyIndexFieldProps,
} from '../fields/index_response_body_field';

export const FieldText = React.forwardRef<HTMLInputElement, EuiFieldTextProps>(
  (props, ref: Ref<HTMLInputElement>) => (
    <EuiFieldText
      {...(omit(props, ['defaultValue', 'selectedOptions']) as EuiFieldTextProps)}
      inputRef={ref}
    />
  )
);

export const FieldNumber = React.forwardRef<HTMLInputElement, EuiFieldNumberProps>((props, ref) => (
  <EuiFieldNumber {...props} inputRef={ref} />
));

export const FieldPassword = React.forwardRef<HTMLInputElement, EuiFieldPasswordProps>(
  (props, ref) => <EuiFieldPassword {...props} inputRef={ref} />
);

export const Checkbox = React.forwardRef<HTMLInputElement, EuiCheckboxProps>((props, _ref) => (
  <EuiCheckbox {...(omit(props, ['defaultValue', 'fullWidth', 'isInvalid']) as EuiCheckboxProps)} />
));

export const Select = React.forwardRef<HTMLSelectElement, EuiSelectProps>((props, ref) => (
  <EuiSelect {...props} inputRef={ref} />
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

export const FormattedComboBox = React.forwardRef<unknown, FormattedComboBoxProps>(
  (props, _ref) => <DefaultFormattedComboBox {...props} />
);

export const ComboBox = React.forwardRef<unknown, EuiComboBoxProps<unknown>>((props, _ref) => (
  <EuiComboBox {...omit(props, ['isServiceManaged'])} />
));

export const JSONEditor = React.forwardRef<unknown, CodeEditorProps>((props, _ref) => (
  <DefaultJSONEditor {...props} />
));

export const MonitorTypeRadioGroup = React.forwardRef<unknown, MonitorTypeRadioGroupProps>(
  (props, _ref) => <DefaultMonitorTypeRadioGroup {...props} />
);

export const HeaderField = React.forwardRef<unknown, HeaderFieldProps>((props, _ref) => (
  <DefaultHeaderField {...props} />
));

export const RequestBodyField = React.forwardRef<unknown, RequestBodyFieldProps>((props, _ref) => (
  <DefaultRequestBodyField {...props} />
));

export const ResponseBodyIndexField = React.forwardRef<unknown, ResponseBodyIndexFieldProps>(
  (props, _ref) => <DefaultResponseBodyIndexField {...props} />
);
