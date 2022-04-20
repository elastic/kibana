/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiText } from '@elastic/eui';

export const OptionalLabel = () => {
  return (
    <EuiText size="xs" color="subdued">
      <FormattedMessage
        id="xpack.uptime.createPackagePolicy.stepConfigure.inputVarFieldOptionalLabel"
        defaultMessage="Optional"
      />
    </EuiText>
  );
};
