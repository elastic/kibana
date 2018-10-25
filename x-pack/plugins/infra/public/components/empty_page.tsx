/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import React from 'react';

interface EmptyPageProps {
  message: string;
  title: string;
  actionLabel: string;
  actionUrl: string;
  'data-test-subj'?: string;
}

export const EmptyPage: React.SFC<EmptyPageProps> = ({
  actionLabel,
  actionUrl,
  message,
  title,
  ...rest
}) => (
  <EuiEmptyPrompt
    title={<h2>{title}</h2>}
    body={<p>{message}</p>}
    actions={
      <EuiButton href={actionUrl} color="primary" fill>
        {actionLabel}
      </EuiButton>
    }
    {...rest}
  />
);
