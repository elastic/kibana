/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiButton, EuiTitle, EuiLink } from '@elastic/eui';

export function SloListEmpty() {
  return (
    <EuiEmptyPrompt
      iconType="logoObservability"
      title={<h2>No SLOs found</h2>}
      body={<p>Add a new SLO or change your filter settings.</p>}
      actions={
        <EuiButton color="primary" fill>
          Add an SLO
        </EuiButton>
      }
      footer={
        <>
          <EuiTitle size="xxs">
            <h3>Want to learn more?</h3>
          </EuiTitle>
          <EuiLink href="#" target="_blank">
            Read the docs
          </EuiLink>
        </>
      }
    />
  );
}
