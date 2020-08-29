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
  formData?: Omit<ProcessorInternal, 'id'>;
}

export const ManageProcessorForm: FunctionComponent<Props> = ({
  processor,
  onFormUpdate,
  onSubmit,
  formData,
  onClose,
  ...rest
}) => {
  const { services } = useKibana();

  const getDefaultProcessorOptions = () => {
    let defaultFields;

    if (formData) {
      const { options } = formData;
      defaultFields = { fields: options };
    } else {
      defaultFields = { fields: processor?.options ?? {} };
    }

    return defaultFields;
  };

  const { form } = useForm({
    defaultValue: getDefaultProcessorOptions(),
  });

  const handleSubmit = useCallback(
    async (shouldCloseFlyout: boolean = true) => {
      const { isValid, data } = await form.submit();

      if (isValid) {
        const { type, customOptions, fields } = data as FormData;
        onSubmit({
          type,
          options: customOptions ? customOptions : fields,
        });

        if (shouldCloseFlyout) {
          onClose();
        }
      }
    },
    [form, onClose, onSubmit]
  );

  const resetProcessors = () => {
    onSubmit({
      type: processor!.type,
      options: processor?.options || {},
    });
  };

  useEffect(() => {
    const subscription = form.subscribe(onFormUpdate);
    return subscription.unsubscribe;

    // TODO: Address this issue
    // For some reason adding `form` object to the dependencies array here is causing an
    // infinite update loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onFormUpdate]);

  return (
    <ViewComponent
      {...rest}
      processor={processor}
      form={form}
      getDefaultProcessorOptions={getDefaultProcessorOptions}
      esDocsBasePath={services.documentation.getEsDocsBasePath()}
      closeFlyout={onClose}
      resetProcessors={resetProcessors}
      handleSubmit={handleSubmit}
    />
  );
};
