/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { FormattedNumber } from '@kbn/i18n-react';

export const CompactFormattedNumber = ({ number }: { number: number }) => (
  <FormattedNumber
    value={number}
    maximumFractionDigits={1}
    notation="compact"
    compactDisplay="short"
  />
);
