/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedNumber } from '@kbn/i18n-react';
import React from 'react';

const FormattedCountComponent: React.FC<{ count: number | null }> = ({ count }) => {
  if (count == null) {
    return null;
  }

  if (count >= 1000) {
    const result = Number((count / 1000).toFixed(2));

    return (
      <b>
        <FormattedNumber value={result} />
        {'K'}
      </b>
    );
  }

  return <b>{count}</b>;
};

export const FormattedCount = React.memo(FormattedCountComponent);
