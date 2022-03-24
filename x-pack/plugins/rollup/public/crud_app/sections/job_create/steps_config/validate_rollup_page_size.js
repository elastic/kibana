/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

export function validateRollupPageSize(rollupPageSize) {
  if (!rollupPageSize || !rollupPageSize.toString().trim()) {
    return [
      <FormattedMessage
        id="xpack.rollupJobs.create.errors.rollupPageSizeMissing"
        defaultMessage="Page size is required."
      />,
    ];
  }

  if (rollupPageSize <= 0) {
    return [
      <FormattedMessage
        id="xpack.rollupJobs.create.errors.rollupPageSizeGreaterThanZero"
        defaultMessage="Page size must be greater than zero."
      />,
    ];
  }

  return undefined;
}
