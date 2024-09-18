/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import type { CallOutMessage } from '../../../common/components/callouts';
import { CallOut } from '../../../common/components/callouts';
import { MissingPrivilegesCallOutBody, MISSING_PRIVILEGES_CALLOUT_TITLE } from './translations';
import type { RiskEngineMissingPrivilegesResponse } from '../../hooks/use_missing_risk_engine_privileges';

export const RiskEnginePrivilegesCallOut: React.FC<{
  privileges: RiskEngineMissingPrivilegesResponse;
}> = ({ privileges }) => {
  if (privileges.isLoading || privileges.hasAllRequiredPrivileges) {
    return null;
  }
  const message: CallOutMessage = {
    type: 'primary',
    id: `missing-risk-engine-privileges`,
    title: MISSING_PRIVILEGES_CALLOUT_TITLE,
    description: <MissingPrivilegesCallOutBody {...privileges.missingPrivileges} />,
  };

  return (
    <>
      <CallOut message={message} showDismissButton={false} />
      <EuiSpacer size="l" />
    </>
  );
};
