/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop } from 'lodash';
import React, { createContext, useContext } from 'react';
import { useFormWrapped } from './use_form_wrapped';

export const FormContext = createContext({ control: {}, register: noop });

export const FormContextProvider = ({ children }: { children: React.ReactNode }) => {
  const { control, register } = useFormWrapped({
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: { select: '' },
    shouldFocusError: true,
  });

  return <FormContext.Provider value={{ control, register }} children={children} />;
};

export const useFormContext = () => useContext(FormContext);
