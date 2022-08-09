/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactElement } from 'react';
import { FC } from 'react';
import { useSecurityContext } from '../../hooks/use_security_context';

interface EnterpriseGuardProps {
  fallback?: ReactElement;
}

export const EnterpriseGuard: FC<EnterpriseGuardProps> = ({ children, fallback = null }) => {
  const { licenseService } = useSecurityContext();

  if (licenseService.isEnterprise()) {
    return <>{children}</>;
  }

  return fallback;
};
