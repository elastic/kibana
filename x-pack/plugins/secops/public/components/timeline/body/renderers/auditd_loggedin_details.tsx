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

import { PrimarySecondaryUserInfo } from './primary_secondary_user_info';
import { SourceDest } from './source_dest_ip';

const Details = styled.div`
  margin: 10px 0px 10px 10px;
`;

const TokensFlexItem = styled(EuiFlexItem)`
  margin-left: 3px;
`;

export const AuditdLoggedinLine = pure<{
  id: string;
  hostName: string | null | undefined;
  result: string | null | undefined;
  session: string | null | undefined;
  userName: string | null | undefined;
  primary: string | null | undefined;
  secondary: string | null | undefined;
  processExecutable: string | null | undefined;
}>(({ id, hostName, result, session, processExecutable, userName, primary, secondary }) => (
  <EuiFlexGroup justifyContent="center" gutterSize="none" wrap={true}>
    <TokensFlexItem grow={false}>Session</TokensFlexItem>
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
    {hostName != null && <TokensFlexItem grow={false}>@</TokensFlexItem>}
    <TokensFlexItem grow={false}>
      <DraggableBadge id={`auditd-executed-element-${id}`} field="host.name" value={hostName} />
    </TokensFlexItem>
    {processExecutable != null && (
      <TokensFlexItem grow={false}>attempted a login via</TokensFlexItem>
    )}
    <TokensFlexItem grow={false}>
      <DraggableBadge
        id={`auditd-loggedin-${id}`}
        field="process.executable"
        value={processExecutable}
        iconType="console"
      />
    </TokensFlexItem>
    {result != null && <TokensFlexItem grow={false}>with result</TokensFlexItem>}
    <TokensFlexItem grow={false}>
      <DraggableBadge
        id={`auditd-loggedin-${id}`}
        field="auditd.result"
        queryValue={result}
        value={result}
      />
    </TokensFlexItem>
  </EuiFlexGroup>
));

export const AuditdLoggedinDetails = pure<{ browserFields: BrowserFields; data: Ecs }>(
  ({ browserFields, data }) => {
    const id = data._id;
    const session: string | null | undefined = get('auditd.session', data);
    const hostName: string | null | undefined = get('host.name', data);
    const userName: string | null | undefined = get('user.name', data);
    const primary: string | null | undefined = get('auditd.summary.actor.primary', data);
    const secondary: string | null | undefined = get('auditd.summary.actor.secondary', data);
    const result: string | null | undefined = get('auditd.result', data);
    const processExecutable: string | null | undefined = get('process.executable', data);
    if (data.process != null) {
      return (
        <Details>
          <AuditdLoggedinLine
            id={id}
            hostName={hostName}
            result={result}
            session={session}
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
