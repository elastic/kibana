/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Ref } from 'react';
import { omit } from 'lodash';
import { ControllerRenderProps } from 'react-hook-form';
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
  FormattedComboBoxProps as DefaultFormattedComboBoxProps,
} from '../fields/combo_box';
import {
  JSONEditor as DefaultJSONEditor,
  CodeEditorProps as DefaultCodeEditorProps,
} from '../fields/code_editor';
import {
  MonitorTypeRadioGroup as DefaultMonitorTypeRadioGroup,
  MonitorTypeRadioGroupProps,
} from '../fields/monitor_type_radio_group';
import {
  HeaderField as DefaultHeaderField,
  HeaderFieldProps as DefaultHeaderFieldProps,
} from '../fields/header_field';
import {
  RequestBodyField as DefaultRequestBodyField,
  RequestBodyFieldProps as DefaultRequestBodyFieldProps,
} from '../fields/request_body_field';
import {
  ResponseBodyIndexField as DefaultResponseBodyIndexField,
  ResponseBodyIndexFieldProps as DefaultResponseBodyIndexFieldProps,
} from '../fields/index_response_body_field';

// these props are automatically passed through to our controlled components
// they do not have to be defined specifically on the 'props' field in the
// `field_config` file
export type ControlledFieldProp = keyof ControllerRenderProps | 'defaultValue';

export type HeaderFieldProps = Omit<DefaultHeaderFieldProps, ControlledFieldProp>;
export type ResponseBodyIndexFieldProps = Omit<
  DefaultResponseBodyIndexFieldProps,
  ControlledFieldProp
>;
export type RequestBodyFieldProps = Omit<DefaultRequestBodyFieldProps, ControlledFieldProp>;
export type CodeEditorProps = Omit<DefaultCodeEditorProps, ControlledFieldProp>;
export type JSONCodeEditorProps = Omit<DefaultCodeEditorProps, ControlledFieldProp | 'languageId'>;
export type FormattedComboBoxProps = Omit<DefaultFormattedComboBoxProps, ControlledFieldProp>;

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

export const FormattedComboBox = React.forwardRef<unknown, DefaultFormattedComboBoxProps>(
  (props, _ref) => <DefaultFormattedComboBox {...props} />
);

export const ComboBox = React.forwardRef<unknown, EuiComboBoxProps<unknown>>((props, _ref) => (
  <EuiComboBox {...omit(props, ['isServiceManaged'])} />
));

export const JSONEditor = React.forwardRef<unknown, DefaultCodeEditorProps>((props, _ref) => (
  <DefaultJSONEditor {...props} />
));

export const MonitorTypeRadioGroup = React.forwardRef<unknown, MonitorTypeRadioGroupProps>(
  (props, _ref) => <DefaultMonitorTypeRadioGroup {...props} />
);

export const HeaderField = React.forwardRef<unknown, DefaultHeaderFieldProps>((props, _ref) => (
  <DefaultHeaderField {...props} />
));

export const RequestBodyField = React.forwardRef<unknown, DefaultRequestBodyFieldProps>(
  (props, _ref) => <DefaultRequestBodyField {...props} />
);

export const ResponseBodyIndexField = React.forwardRef<unknown, DefaultResponseBodyIndexFieldProps>(
  (props, _ref) => <DefaultResponseBodyIndexField {...props} />
);
