/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FC } from 'react';
import { Paywall } from '../../components/paywall';
import { useKibana } from '../../hooks/use_kibana';
import { useSecurityContext } from '../../hooks/use_security_context';

export const EnterpriseGuard: FC = ({ children }) => {
  const { licenseService } = useSecurityContext();
  const {
    services: { http },
  } = useKibana();

  if (licenseService.isEnterprise()) {
    return <>{children}</>;
  }

  return (
    <Paywall
      licenseManagementHref={http.basePath.prepend('/app/management/stack/license_management')}
    />
  );
};
