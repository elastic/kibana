/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { OnFormUpdateArg } from '../../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib';
import { SerializeResult } from './serialize';
import { ProcessorInfo } from './components/processors_tree';

/**
 * An array of keys that map to a value in an object
 * structure.
 *
 * For instance:
 * ['a', 'b', '0', 'c'] given { a: { b: [ { c: [] } ] } } => []
 *
 * Additionally, an empty selector `[]`, is a special indicator
 * for the root level.
 */
export type ProcessorSelector = string[];

/** @private */
export interface ProcessorInternal<CustomProcessorOptions = {}> {
  id: string;
  type: string;
  options: { [key: string]: any };
  onFailure?: ProcessorInternal[];
}

export { OnFormUpdateArg };

export interface FormValidityState {
  validate: OnFormUpdateArg<any>['validate'];
}

export interface OnUpdateHandlerArg extends FormValidityState {
  getData: () => SerializeResult;
}

/**
 * The editor can be in different modes. This enables us to hold
 * a reference to data dispatch to the reducer (like the {@link ProcessorSelector}
 * which will be used to update the in-memory processors data structure.
 */
export type EditorMode =
  | { id: 'creatingProcessor'; arg: { selector: ProcessorSelector } }
  | { id: 'movingProcessor'; arg: ProcessorInfo }
  | { id: 'editingProcessor'; arg: { processor: ProcessorInternal; selector: ProcessorSelector } }
  | { id: 'removingProcessor'; arg: { selector: ProcessorSelector } }
  | { id: 'idle' };
