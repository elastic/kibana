/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

export function validateName(name) {
  if (name == null || !name.trim()) {
    return (
      <FormattedMessage
        id="xpack.remoteClusters.form.errors.nameMissing"
        defaultMessage="Name is required."
      />
    );
  }

  if (name.match(/[^a-zA-Z\d\-_]/)) {
    return (
      <FormattedMessage
        id="xpack.remoteClusters.form.errors.illegalCharacters"
        defaultMessage="Name contains invalid characters."
      />
    );
  }

  return null;
}
