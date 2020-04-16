/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useEffect, useState } from 'react';
import { EuiButton } from '@elastic/eui';
import { Form, useForm } from '../../../../shared_imports';

import { PipelineEditorProcessor } from '../../types';

import { getProcessorFormDescriptor } from './map_processor_type_to_form';
import { CommonProcessorFields, ProcessorTypeField } from './processors/common_fields';

export type ProcessorSettingsFromOnSubmitArg = Omit<PipelineEditorProcessor, 'id'>;

export interface Props {
  processor?: PipelineEditorProcessor;
  onSubmit: (processor: ProcessorSettingsFromOnSubmitArg) => void;
}

export const ProcessorSettingsForm: FunctionComponent<Props> = ({ processor, onSubmit }) => {
  const handleSubmit = (data: any, isValid: boolean) => {
    if (isValid) {
      const { type, ...options } = data;
      onSubmit({
        type,
        options,
      });
    }
  };

  const [type, setType] = useState<string | undefined>(processor?.type);

  const { form } = useForm({
    defaultValue: processor ? { ...processor.options } : undefined,
    onSubmit: handleSubmit,
  });

  useEffect(() => {
    const subscription = form.subscribe(({ data }) => {
      if (data.raw.type !== type) {
        setType(data.raw.type);
      }
    });
    return subscription.unsubscribe;
  });

  let FormFields: FunctionComponent | undefined;

  if (type) {
    FormFields = getProcessorFormDescriptor(type as any);

    // TODO: Handle this error in a different way
    if (!FormFields) {
      throw new Error(`Could not find form for type ${type}`);
    }
  }

  return (
    <Form form={form}>
      <ProcessorTypeField initialType={processor?.type} />
      {FormFields && (
        <>
          <FormFields />
          <CommonProcessorFields />
          <EuiButton onClick={form.submit}>Submit</EuiButton>
        </>
      )}
    </Form>
  );
};
