/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { EuiPageBody, EuiPageContent, EuiSpacer, EuiTitle } from '@elastic/eui';
import { Form1 } from './form_1';
import { Form2 } from './form_2';

export const HookFormPOC = () => {
  return (
    <EuiPageBody>
      <EuiPageContent>
        <EuiTitle size="l">
          <h1>POC Hook Form..</h1>
        </EuiTitle>

        <Form1 />
        <EuiSpacer size="m" />

        <Form2 />
        <EuiSpacer size="m" />
      </EuiPageContent>
    </EuiPageBody>
  );
};
