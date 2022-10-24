/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { FunctionComponent } from 'react';
import { EuiTitle } from '@elastic/eui';
import { i18nTexts } from '../i18n_texts';

export const Title: FunctionComponent = () => (
  <EuiTitle>
    <h2>{i18nTexts.title}</h2>
  </EuiTitle>
);
