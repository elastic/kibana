/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useCallback, useEffect } from 'react';

import { useForm, OnFormUpdateArg, FormData } from '../../../../../shared_imports';
import { ProcessorInternal } from '../../types';

import { ManageProcessorForm as ViewComponent } from './manage_processor_form';
import { usePipelineProcessorsContext } from '../../context';

export type ManageProcessorFormOnSubmitArg = Omit<ProcessorInternal, 'id'>;

export type OnSubmitHandler = (processor: ManageProcessorFormOnSubmitArg) => void;

export type OnFormUpdateHandler = (form: OnFormUpdateArg<any>) => void;

interface Props {
  onFormUpdate: OnFormUpdateHandler;
  onSubmit: OnSubmitHandler;
  isOnFailure: boolean;
  onOpen: () => void;
  onClose: () => void;
  processor?: ProcessorInternal;
}

export const ManageProcessorForm: FunctionComponent<Props> = ({
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
        const { type, customOptions, fields } = data;
        onSubmit({
          type,
          options: customOptions ? customOptions : fields,
        });
      }
    },
    [onSubmit]
  );

  const maybeProcessorOptions = processor?.options;
  const { form } = useForm({
    defaultValue: { fields: maybeProcessorOptions ?? {} },
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
