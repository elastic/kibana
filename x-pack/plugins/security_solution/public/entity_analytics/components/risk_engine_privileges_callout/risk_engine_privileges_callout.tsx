/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import hash from 'object-hash';
import type { CallOutMessage } from '../../../common/components/callouts';
import { CallOutSwitcher } from '../../../common/components/callouts';
import { MissingPrivilegesCallOutBody, MISSING_PRIVILEGES_CALLOUT_TITLE } from './translations';
import { useMissingPrivileges } from './use_missing_risk_engine_privileges';

export const RiskEnginePrivilegesCallOut = () => {
  const missingPrivileges = useMissingPrivileges();

  const message: CallOutMessage | null = useMemo(() => {
    const hasMissingPrivileges =
      missingPrivileges.indexPrivileges.length > 0 ||
      missingPrivileges.clusterPrivileges.length > 0 ||
      missingPrivileges.kibanaPrivileges.length > 0;

    if (!hasMissingPrivileges) {
      return null;
    }

    return {
      type: 'primary',
      id: `missing-risk-engine-privileges`,
      title: MISSING_PRIVILEGES_CALLOUT_TITLE,
      description: <MissingPrivilegesCallOutBody {...missingPrivileges} />,
    };
  }, [missingPrivileges]);

  return (
    message && <CallOutSwitcher namespace="entity_analytics" condition={true} message={message} />
  );
};
