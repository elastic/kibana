/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

export function validateSeeds(seeds, seedInput) {
  const seedsHaveBeenCreated = seeds.some((seed) => Boolean(seed.trim()));

  if (seedsHaveBeenCreated) {
    return null;
  }

  // If the user hasn't entered any seeds then we only want to prompt them for some if they
  // aren't already in the process of entering one in. In this case, we'll just show the
  // combobox-specific validation.
  if (seedInput) {
    return null;
  }

  return (
    <FormattedMessage
      id="xpack.remoteClusters.form.errors.seedMissing"
      defaultMessage="At least one seed node is required."
    />
  );
}
