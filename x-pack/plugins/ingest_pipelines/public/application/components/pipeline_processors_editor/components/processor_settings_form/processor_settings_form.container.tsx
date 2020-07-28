/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useCallback, useEffect } from 'react';

import { useForm, OnFormUpdateArg, FormData } from '../../../../../shared_imports';
import { ProcessorInternal } from '../../types';

import { ProcessorSettingsForm as ViewComponent } from './processor_settings_form';
import { usePipelineProcessorsContext } from '../../context';

export type ProcessorSettingsFromOnSubmitArg = Omit<ProcessorInternal, 'id'>;

export type OnSubmitHandler = (processor: ProcessorSettingsFromOnSubmitArg) => void;

export type OnFormUpdateHandler = (form: OnFormUpdateArg<any>) => void;

interface Props {
  onFormUpdate: OnFormUpdateHandler;
  onSubmit: OnSubmitHandler;
  isOnFailure: boolean;
  onOpen: () => void;
  onClose: () => void;
  processor?: ProcessorInternal;
}

export const ProcessorSettingsForm: FunctionComponent<Props> = ({
  processor,
  onFormUpdate,
  onSubmit,
  ...rest
}) => {
  const {
    links: { esDocsBasePath },
  } = usePipelineProcessorsContext();

  const handleSubmit = useCallback(
    async (data: FormData, isValid: boolean) => {
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
    defaultValue: processor?.options,
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

  return (
    <ViewComponent {...rest} processor={processor} form={form} esDocsBasePath={esDocsBasePath} />
  );
};
