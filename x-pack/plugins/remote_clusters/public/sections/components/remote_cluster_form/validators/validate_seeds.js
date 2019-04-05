/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

export function validateSeeds(seeds) {
  const seedsHaveBeenCreated = seeds.some(seed => Boolean(seed.trim()));

  if (seedsHaveBeenCreated) {
    return null;
  }

  return (
    <FormattedMessage
      id="xpack.remoteClusters.form.errors.seedMissing"
      defaultMessage="At least one seed node is required."
    />
  );
}
