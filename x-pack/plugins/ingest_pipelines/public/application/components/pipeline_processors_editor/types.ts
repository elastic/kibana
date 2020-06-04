/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESCommonProcessorOptions } from '../../../../common/types';
import { OnFormUpdateArg } from '../../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib';
import { SerializeResult } from './serialize';

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

export type ProcessorOptions<CustomProcessorOptions = {}> = ESCommonProcessorOptions &
  CustomProcessorOptions;

/** @private */
export interface ProcessorInternal<CustomProcessorOptions = {}> {
  id: string;
  type: string;
  options: ProcessorOptions<CustomProcessorOptions>;
  onFailure?: ProcessorInternal[];
}

export { OnFormUpdateArg };

export interface FormValidityState {
  validate: OnFormUpdateArg<any>['validate'];
}

export interface OnUpdateHandlerArg extends FormValidityState {
  getData: () => SerializeResult;
}
