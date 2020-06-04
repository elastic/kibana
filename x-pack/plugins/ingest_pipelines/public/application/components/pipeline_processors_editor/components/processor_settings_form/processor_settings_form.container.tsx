/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useCallback, useEffect } from 'react';

import { useForm, OnFormUpdateArg } from '../../../../../shared_imports';
import { ProcessorInternal } from '../../types';

import { ProcessorSettingsForm as ViewComponent } from './processor_settings_form';

export type ProcessorSettingsFromOnSubmitArg = Omit<ProcessorInternal, 'id'>;

interface Props {
  onFormUpdate: (form: OnFormUpdateArg<any>) => void;
  onSubmit: (processor: ProcessorSettingsFromOnSubmitArg) => void;
  processor?: ProcessorInternal;
}

export const ProcessorSettingsForm: FunctionComponent<Props> = ({
  processor,
  onFormUpdate,
  onSubmit,
}) => {
  const handleSubmit = useCallback(
    async (data: any, isValid: boolean) => {
      if (isValid) {
        const { type, customOptions, ...options } = data;
        onSubmit({
          type,
          options: customOptions ? customOptions : options,
        });
      }
    },
    [onSubmit]
  );

  const { form } = useForm({
    onSubmit: handleSubmit,
  });

  useEffect(() => {
    const subscription = form.subscribe(onFormUpdate);
    return subscription.unsubscribe;

    // TODO: Address this issue
    // For some reason adding `form` object to the dependencies array here is causing an
    // infinite update loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onFormUpdate]);

  return <ViewComponent processor={processor} form={form} />;
};
