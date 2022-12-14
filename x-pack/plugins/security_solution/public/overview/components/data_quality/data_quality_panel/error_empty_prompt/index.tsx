/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import React from 'react';

interface Props {
  error: string;
  title: string;
}

const ErrorEmptyPromptComponent: React.FC<Props> = ({ error, title }) => (
  <EuiEmptyPrompt
    body={<p>{error}</p>}
    color="danger"
    iconType="alert"
    layout="vertical"
    title={<h2>{title}</h2>}
    titleSize="m"
  />
);

ErrorEmptyPromptComponent.displayName = 'ErrorEmptyPromptComponent';

export const ErrorEmptyPrompt = React.memo(ErrorEmptyPromptComponent);
