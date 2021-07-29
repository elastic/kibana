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
  packageName: string | null | undefined;
  packageSummary: string | null | undefined;
  packageVersion: string | null | undefined;
}

export const Package = React.memo<Props>(
  ({ contextId, eventId, isDraggable, packageName, packageSummary, packageVersion }) => {
    if (packageName != null || packageSummary != null || packageVersion != null) {
      return (
        <>
          <TokensFlexItem grow={false} component="span">
            <DraggableBadge
              contextId={contextId}
              eventId={eventId}
              field="system.audit.package.name"
              isDraggable={isDraggable}
              value={packageName}
              iconType="document"
            />
          </TokensFlexItem>
          <TokensFlexItem grow={false} component="span">
            <DraggableBadge
              contextId={contextId}
              eventId={eventId}
              field="system.audit.package.version"
              isDraggable={isDraggable}
              value={packageVersion}
              iconType="document"
            />
          </TokensFlexItem>
          <TokensFlexItem grow={false} component="span">
            <DraggableBadge
              contextId={contextId}
              eventId={eventId}
              field="system.audit.package.summary"
              isDraggable={isDraggable}
              value={packageSummary}
            />
          </TokensFlexItem>
        </>
      );
    } else {
      return null;
    }
  }
);

Package.displayName = 'Package';
