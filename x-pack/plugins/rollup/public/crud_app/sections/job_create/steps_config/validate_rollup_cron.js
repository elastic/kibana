/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import cronstrue from 'cronstrue';
import { FormattedMessage } from '@kbn/i18n-react';

export function validateRollupCron(rollupCron) {
  if (!rollupCron || !rollupCron.trim()) {
    return [
      <FormattedMessage
        id="xpack.rollupJobs.create.errors.rollupCronMissing"
        defaultMessage="Cron pattern or basic interval is required."
      />,
    ];
  }

  try {
    cronstrue.toString(rollupCron);
  } catch (error) {
    const prefix = 'Error: ';
    const prefixIndex = error.indexOf(prefix);

    // Note: cronstrue ships with a localizable version. Refer to the docs for more
    // info on how we can display a localized error value.
    return error.substring(prefixIndex + prefix.length);
  }

  return undefined;
}
