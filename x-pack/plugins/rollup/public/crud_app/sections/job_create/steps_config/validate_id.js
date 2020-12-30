/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

export function validateId(id, clonedId) {
  if (clonedId && id === clonedId) {
    return [
      <FormattedMessage
        id="xpack.rollupJobs.create.errors.idSameAsCloned"
        defaultMessage='Name cannot be the same as cloned name: "{clonedId}".'
        values={{ clonedId }}
      />,
    ];
  }

  if (!id || !id.trim()) {
    return [
      <FormattedMessage
        id="xpack.rollupJobs.create.errors.idMissing"
        defaultMessage="Name is required."
      />,
    ];
  }

  return undefined;
}
