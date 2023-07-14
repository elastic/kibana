/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { lazy } from 'react';
import { suspendedComponentWithProps } from '../lib/suspended_component_with_props';

export { JsonEditorWithMessageVariables } from './json_editor_with_message_variables';
export { TextFieldWithMessageVariables } from './text_field_with_message_variables';
export { TextAreaWithMessageVariables } from './text_area_with_message_variables';
export { SimpleConnectorForm } from './simple_connector_form';
export type { ConfigFieldSchema, SecretsFieldSchema } from './simple_connector_form';
export { JsonFieldWrapper } from './json_field_wrapper';
export { MustacheTextFieldWrapper } from './mustache_text_field_wrapper';
export { SectionLoading } from './section_loading';

export const TextAreaWithAutocomplete = suspendedComponentWithProps(
  lazy(() => import('./text_area_with_autocomplete'))
);
