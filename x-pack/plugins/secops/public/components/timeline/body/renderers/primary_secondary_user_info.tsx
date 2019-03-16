/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { DraggableBadge } from '../../../draggables';

const TokensFlexItem = styled(EuiFlexItem)`
  margin-left: 3px;
`;

export const nilOrUnSet = (value?: string | null) =>
  value == null || value.toLowerCase() === 'unset';

export const PrimarySecondary = pure<{
  id: string;
  primary: string | null | undefined;
  secondary: string | null | undefined;
}>(({ id, primary, secondary }) => {
  if (nilOrUnSet(primary) && nilOrUnSet(secondary)) {
    return null;
  } else if (!nilOrUnSet(primary) && nilOrUnSet(secondary)) {
    return (
      <DraggableBadge
        id={id}
        field="auditd.summary.actor.primary"
        value={primary}
        iconType="user"
      />
    );
  } else if (nilOrUnSet(primary) && !nilOrUnSet(secondary)) {
    return (
      <DraggableBadge
        id={id}
        field="auditd.summary.actor.secondary"
        value={secondary}
        iconType="user"
      />
    );
  } else if (primary === secondary) {
    return (
      <DraggableBadge
        id={id}
        field="auditd.summary.actor.secondary"
        value={secondary}
        iconType="user"
      />
    );
  } else {
    return (
      <EuiFlexGroup gutterSize="none">
        <TokensFlexItem grow={false}>
          <DraggableBadge
            id={id}
            field="auditd.summary.actor.primary"
            value={primary}
            iconType="user"
          />
        </TokensFlexItem>
        <TokensFlexItem grow={false}>as</TokensFlexItem>
        <TokensFlexItem grow={false}>
          <DraggableBadge
            id={id}
            field="auditd.summary.actor.secondary"
            value={secondary}
            iconType="user"
          />
        </TokensFlexItem>
      </EuiFlexGroup>
    );
  }
});

export const PrimarySecondaryUserInfo = pure<{
  id: string;
  userName: string | null | undefined;
  primary: string | null | undefined;
  secondary: string | null | undefined;
}>(({ id, userName, primary, secondary }) => {
  if (nilOrUnSet(userName) && nilOrUnSet(primary) && nilOrUnSet(secondary)) {
    return null;
  } else if (
    !nilOrUnSet(userName) &&
    !nilOrUnSet(primary) &&
    !nilOrUnSet(secondary) &&
    userName === primary &&
    userName === secondary
  ) {
    return <DraggableBadge id={id} field="user.name" value={userName} iconType="user" />;
  } else if (!nilOrUnSet(userName) && nilOrUnSet(primary) && nilOrUnSet(secondary)) {
    return <DraggableBadge id={id} field="user.name" value={userName} iconType="user" />;
  } else {
    return <PrimarySecondary id={id} primary={primary} secondary={secondary} />;
  }
});
