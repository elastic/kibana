/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';

import { Form as LibForm, FormHook } from '../../../../../shared_imports';

import { ConfigurationIssuesProvider } from '../configuration_issues_context';
import { FormErrorsProvider } from '../form_errors_context';

interface Props {
  form: FormHook;
}

export const Form: FunctionComponent<Props> = ({ form, children }) => (
  <LibForm form={form}>
    <ConfigurationIssuesProvider>
      <FormErrorsProvider>{children}</FormErrorsProvider>
    </ConfigurationIssuesProvider>
  </LibForm>
);
