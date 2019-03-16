/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { get } from 'lodash/fp';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { BrowserFields } from '../../../../containers/source';
import { Ecs } from '../../../../graphql/types';
import { DraggableBadge } from '../../../draggables';

import { SourceDest } from './source_dest_ip';
import { PrimarySecondaryUserInfo } from './user_primary_secondary';

const Details = styled.div`
  margin-left: 10px;
  margin-top: 10px;
  margin-bottom: 10px;
`;

const TokensFlexItem = styled(EuiFlexItem)`
  margin-left: 3px;
`;

export const AuditdLoggedinLine = pure<{
  id: string;
  result?: string | null;
  session?: string | null;
  userName?: string | null;
  primary?: string | null;
  secondary?: string | null;
  processPid?: string | null;
  processExecutable?: string | null;
}>(({ id, result, session, processPid, processExecutable, userName, primary, secondary }) => (
  <EuiFlexGroup justifyContent="center" gutterSize="none">
    <TokensFlexItem grow={false}>
      <DraggableBadge
        id={`auditd-loggedin-${id}`}
        field="auditd.session"
        value={session}
        iconType="number"
      />
    </TokensFlexItem>
    <TokensFlexItem grow={false}>
      <PrimarySecondaryUserInfo
        id={`auditd-loggedin-${id}`}
        userName={userName}
        primary={primary}
        secondary={secondary}
      />
    </TokensFlexItem>
    <TokensFlexItem grow={false}>
      <DraggableBadge
        id={`auditd-loggedin-${id}`}
        field="process.pid"
        queryValue={processPid}
        value={processExecutable}
        iconType="console"
      />
    </TokensFlexItem>
    <TokensFlexItem grow={false}>
      <DraggableBadge
        id={`auditd-loggedin-${id}`}
        field="auditd.result"
        queryValue={result}
        value={`Result: ${result}`}
        iconType="tag"
      />
    </TokensFlexItem>
  </EuiFlexGroup>
));

export const AuditdLoggedinDetails = pure<{ browserFields: BrowserFields; data: Ecs }>(
  ({ browserFields, data }) => {
    const id = data._id;
    const userName: string | null | undefined = get('user.name', data);
    const primary: string | null | undefined = get('auditd.summary.actor.primary', data);
    const secondary: string | null | undefined = get('auditd.summary.actor.secondary', data);
    const result: string | null | undefined = get('auditd.result', data);
    const session: string | null | undefined = get('auditd.session', data);
    const processPid: string | null | undefined = get('process.pid', data);
    const processExecutable: string | null | undefined = get('process.executable', data);
    if (data.process != null) {
      return (
        <Details>
          <AuditdLoggedinLine
            id={id}
            result={result}
            session={session}
            processPid={processPid}
            processExecutable={processExecutable}
            primary={primary}
            secondary={secondary}
            userName={userName}
          />
          <EuiSpacer size="s" />
          <SourceDest data={data} browserFields={browserFields} />
        </Details>
      );
    } else {
      return null;
    }
  }
);
