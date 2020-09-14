/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useCallback, useEffect } from 'react';

import { useForm, OnFormUpdateArg, FormData, useKibana } from '../../../../../shared_imports';
import { ProcessorInternal } from '../../types';

import { ManageProcessorForm as ViewComponent } from './manage_processor_form';

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
  const { services } = useKibana();

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

  const { subscribe } = form;

  useEffect(() => {
    const subscription = subscribe(onFormUpdate);
    return subscription.unsubscribe;
  }, [onFormUpdate, subscribe]);

  return (
    <ViewComponent
      {...rest}
      processor={processor}
      form={form}
      esDocsBasePath={services.documentation.getEsDocsBasePath()}
    />
  );
};
