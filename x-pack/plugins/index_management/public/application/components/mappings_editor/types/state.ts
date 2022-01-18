/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormHook, OnFormUpdateArg, RuntimeField } from '../shared_imports';
import {
  Field,
  NormalizedFields,
  NormalizedRuntimeField,
  NormalizedRuntimeFields,
} from './document_fields';
import { FieldsEditor, SearchResult } from './mappings_editor';

export type Mappings = MappingsTemplates &
  MappingsConfiguration & {
    properties?: MappingsFields;
  };

export interface MappingsConfiguration {
  enabled?: boolean;
  throwErrorsForUnmappedFields?: boolean;
  date_detection?: boolean;
  numeric_detection?: boolean;
  dynamic_date_formats?: string[];
  _source?: {
    enabled?: boolean;
    includes?: string[];
    excludes?: string[];
  };
  _meta?: string;
  _size?: { enabled: boolean };
}

export interface MappingsTemplates {
  dynamic_templates?: DynamicTemplate[];
}

export interface DynamicTemplate {
  [key: string]: {
    mapping: {
      [key: string]: any;
    };
    match_mapping_type?: string;
    match?: string;
    unmatch?: string;
    match_pattern?: string;
    path_match?: string;
    path_unmatch?: string;
  };
}

export interface MappingsFields {
  [key: string]: any;
}

export type DocumentFieldsStatus = 'idle' | 'editingField' | 'creatingField';

export interface DocumentFieldsState {
  status: DocumentFieldsStatus;
  editor: FieldsEditor;
  fieldToEdit?: string;
  fieldToAddFieldTo?: string;
}

interface RuntimeFieldsListState {
  status: DocumentFieldsStatus;
  fieldToEdit?: string;
}

export interface ConfigurationFormState extends OnFormUpdateArg<MappingsConfiguration> {
  defaultValue: MappingsConfiguration;
  submitForm?: FormHook<MappingsConfiguration>['submit'];
}

interface TemplatesFormState extends OnFormUpdateArg<MappingsTemplates> {
  defaultValue: MappingsTemplates;
  submitForm?: FormHook<MappingsTemplates>['submit'];
}

export interface State {
  isValid: boolean | undefined;
  configuration: ConfigurationFormState;
  documentFields: DocumentFieldsState;
  runtimeFieldsList: RuntimeFieldsListState;
  fields: NormalizedFields;
  runtimeFields: NormalizedRuntimeFields;
  fieldForm?: OnFormUpdateArg<any>;
  fieldsJsonEditor: {
    format(): MappingsFields;
    isValid: boolean;
  };
  search: {
    term: string;
    result: SearchResult[];
  };
  templates: TemplatesFormState;
}

export type Action =
  | { type: 'editor.replaceMappings'; value: { [key: string]: any } }
  | { type: 'configuration.update'; value: Partial<ConfigurationFormState> }
  | { type: 'configuration.save'; value: MappingsConfiguration }
  | { type: 'templates.update'; value: Partial<State['templates']> }
  | { type: 'templates.save'; value: MappingsTemplates }
  | { type: 'fieldForm.update'; value: OnFormUpdateArg<any> }
  | { type: 'field.add'; value: Field }
  | { type: 'field.remove'; value: string }
  | { type: 'field.edit'; value: Field }
  | { type: 'field.toggleExpand'; value: { fieldId: string; isExpanded?: boolean } }
  | { type: 'documentField.createField'; value?: string }
  | { type: 'documentField.editField'; value: string }
  | { type: 'documentField.changeStatus'; value: DocumentFieldsStatus }
  | { type: 'documentField.changeEditor'; value: FieldsEditor }
  | { type: 'runtimeFieldsList.createField' }
  | { type: 'runtimeFieldsList.editField'; value: string }
  | { type: 'runtimeFieldsList.closeRuntimeFieldEditor' }
  | { type: 'runtimeField.add'; value: RuntimeField }
  | { type: 'runtimeField.remove'; value: string }
  | { type: 'runtimeField.edit'; value: NormalizedRuntimeField }
  | { type: 'fieldsJsonEditor.update'; value: { json: { [key: string]: any }; isValid: boolean } }
  | { type: 'search:update'; value: string }
  | { type: 'validity:update'; value: boolean };

export type Dispatch = (action: Action) => void;
