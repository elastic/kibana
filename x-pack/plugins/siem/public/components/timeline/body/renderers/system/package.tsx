/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { pure } from 'recompose';

import { TokensFlexItem } from '..';
import { DraggableBadge } from '../../../../draggables';

interface Props {
  contextId: string;
  eventId: string;
  packageName: string | null | undefined;
  packageSummary: string | null | undefined;
  packageVersion: string | null | undefined;
}

export const Package = pure<Props>(
  ({ contextId, eventId, packageName, packageSummary, packageVersion }) => {
    if (packageName != null || packageSummary != null || packageVersion != null) {
      return (
        <>
          <TokensFlexItem grow={false} component="span">
            <DraggableBadge
              contextId={contextId}
              eventId={eventId}
              field="system.audit.package.name"
              value={packageName}
              iconType="document"
            />
          </TokensFlexItem>
          <TokensFlexItem grow={false} component="span">
            <DraggableBadge
              contextId={contextId}
              eventId={eventId}
              field="system.audit.package.version"
              value={packageVersion}
              iconType="document"
            />
          </TokensFlexItem>
          <TokensFlexItem grow={false} component="span">
            <DraggableBadge
              contextId={contextId}
              eventId={eventId}
              field="system.audit.package.summary"
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
