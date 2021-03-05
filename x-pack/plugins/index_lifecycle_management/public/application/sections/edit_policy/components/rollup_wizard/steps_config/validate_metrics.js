/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

export function validateMetrics(metrics) {
  if (!metrics.length) {
    return [
      <FormattedMessage
        id="xpack.indexLifecycleMgmt.rollup.create.errors.oneMetricRequired"
        key="xpack.indexLifecycleMgmt.rollup.create.errors.oneMetricRequired"
        defaultMessage="At least one metric is required."
      />,
    ];
  }

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
        id="xpack.indexLifecycleMgmt.rollup.create.errors.metricsTypesMissing"
        key="xpack.indexLifecycleMgmt.rollup.create.errors.metricsTypesMissing"
        defaultMessage="Select metrics types for these fields or remove them: {allMissingTypes}."
        values={{ allMissingTypes }}
      />,
    ];
  }

  return undefined;
}
