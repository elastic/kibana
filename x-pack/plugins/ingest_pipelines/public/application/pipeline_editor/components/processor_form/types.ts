/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FunctionComponent } from 'react';
import { PipelineEditorProcessor } from '../../types';
import { FormSchema } from '../../../../shared_imports';

export type ProcessorFormComponent<Props = {}> = FunctionComponent<{
  processor: PipelineEditorProcessor<Props>;
}>;

export interface ProcessorFormDescriptor {
  Component: ProcessorFormComponent<any>;
  formSchema: FormSchema;
}
