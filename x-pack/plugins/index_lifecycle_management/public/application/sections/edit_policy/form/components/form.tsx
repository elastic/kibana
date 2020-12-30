/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';

import { Form as LibForm, FormHook } from '../../../../../shared_imports';

import { ConfigurationIssuesProvider } from '../configuration_issues_context';

interface Props {
  form: FormHook;
}

export const Form: FunctionComponent<Props> = ({ form, children }) => (
  <LibForm form={form}>
    <ConfigurationIssuesProvider>{children}</ConfigurationIssuesProvider>
  </LibForm>
);
