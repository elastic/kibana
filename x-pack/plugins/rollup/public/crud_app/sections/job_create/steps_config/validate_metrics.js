/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

export function validateMetrics(metrics) {
  const missingTypes = metrics.reduce((accumMissingTypes, { name, types }) => {
    if (!types.length) {
      accumMissingTypes.push(name);
    }

    return accumMissingTypes;
  }, []);

  if (missingTypes.length) {
    const allMissingTypes = missingTypes.join(', ');

    return [
      <FormattedMessage
        id="xpack.rollupJobs.create.errors.metricsTypesMissing"
        key="xpack.rollupJobs.create.errors.metricsTypesMissing"
        defaultMessage="Select metrics types for these fields or remove them: {allMissingTypes}."
        values={{ allMissingTypes }}
      />,
    ];
  }

  return undefined;
}
