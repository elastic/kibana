/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FunctionComponent } from 'react';
import { PipelineEditorProcessor } from '../types';

export type ProcessorFormComponent<E = {}> = FunctionComponent<{
  processor: PipelineEditorProcessor<E>;
  onSubmit: (processor: PipelineEditorProcessor<E>) => void;
}>;
