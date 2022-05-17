/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import semverLt from 'semver/functions/lt';

interface Props {
  version?: string;
  value: string;
}

export const RuleAlertCount = memo((props: Props) => {
  const { version, value } = props;

  if (version) {
    try {
      const intValue = parseInt(value, 10);
      if (intValue === 0 && semverLt(version, '8.3.0')) {
        return <>{'--'}</>;
      }
    } catch (err) {
      return <>{value}</>;
    }
  }

  return <>{value}</>;
});
