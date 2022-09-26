/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import React from 'react';
import { SHORT_EMPTY_TITLE, NOT_AVAILABLE } from './translations';

export const OsqueryNotAvailablePrompt = () => (
  <EuiEmptyPrompt
    iconType="logoOsquery"
    title={<h2>{SHORT_EMPTY_TITLE}</h2>}
    titleSize="xs"
    body={<p>{NOT_AVAILABLE}</p>}
  />
);
