/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { PipelineEditorProcessor } from '../../types';
import { Form, useForm } from '../../../../shared_imports';
import { getProcessorFormDescriptor } from './map_processor_type_to_form';
import { CommonProcessorFields, formSchema as commonFormSchema } from './common_processor_fields';

export interface Props {
  processor: PipelineEditorProcessor;
  onSubmit: (processor: PipelineEditorProcessor) => void;
}

export const ProcessorForm: FunctionComponent<Props> = ({ processor }) => {
  const formDescriptor = getProcessorFormDescriptor(processor.type);

  // TODO: Handle this error in a different way
  if (!formDescriptor) {
    throw new Error(`Could not find form for type ${processor.type}`);
  }

  const { form } = useForm({
    defaultValue: { ...processor.options },
    schema: {
      ...commonFormSchema,
      ...formDescriptor.formSchema,
    },
  });

  return (
    <Form form={form}>
      <formDescriptor.Component processor={processor} />
      <CommonProcessorFields />
    </Form>
  );
};
