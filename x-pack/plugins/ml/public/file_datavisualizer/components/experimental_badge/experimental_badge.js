/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiBetaBadge,
} from '@elastic/eui';

export function ExperimentalBadge({ tooltipContent }) {
  return (
    <span>
      <EuiBetaBadge className="ml-experimental-badge" label="Experimental" tooltipContent={tooltipContent} />
    </span>
  );
}
