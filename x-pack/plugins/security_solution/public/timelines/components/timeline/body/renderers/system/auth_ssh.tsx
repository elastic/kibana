/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { DraggableBadge } from '../../../../../../common/components/draggables';
import { TokensFlexItem } from '../helpers';

interface Props {
  contextId: string;
  eventId: string;
  isDraggable?: boolean;
  sshSignature: string | null | undefined;
  sshMethod: string | null | undefined;
}

export const AuthSsh = React.memo<Props>(
  ({ contextId, eventId, isDraggable, sshSignature, sshMethod }) => (
    <>
      {sshSignature != null && (
        <TokensFlexItem grow={false} component="span">
          <DraggableBadge
            contextId={contextId}
            eventId={eventId}
            field="system.audit.package.name"
            isDraggable={isDraggable}
            value={sshSignature}
            iconType="document"
            isAggregatable={true}
            fieldType="keyword"
          />
        </TokensFlexItem>
      )}
      {sshMethod != null && (
        <TokensFlexItem grow={false} component="span">
          <DraggableBadge
            contextId={contextId}
            eventId={eventId}
            field="system.audit.package.version"
            isDraggable={isDraggable}
            value={sshMethod}
            iconType="document"
            isAggregatable={true}
            fieldType="keyword"
          />
        </TokensFlexItem>
      )}
    </>
  )
);

AuthSsh.displayName = 'AuthSsh';
