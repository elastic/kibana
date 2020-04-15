/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESCommonProcessorOptions } from '../../../common/types';

export interface PipelineEditorProcessor<CustomProcessorOptions = {}> {
  readonly id: string;
  type: string;
  options: ESCommonProcessorOptions & CustomProcessorOptions;
  onFailure?: PipelineEditorProcessor[];
}
