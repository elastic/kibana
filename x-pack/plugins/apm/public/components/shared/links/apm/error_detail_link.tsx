/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { APMLink, APMLinkExtendProps } from './apm_link';

interface Props extends APMLinkExtendProps {
  serviceName: string;
  errorGroupId: string;
}

function ErrorDetailLink({ serviceName, errorGroupId, ...rest }: Props) {
  return (
    <APMLink
      path={`/services/${serviceName}/errors/${errorGroupId}`}
      {...rest}
    />
  );
}

export { ErrorDetailLink };
