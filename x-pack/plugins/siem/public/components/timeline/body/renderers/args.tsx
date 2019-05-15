/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { pure } from 'recompose';

import { DraggableBadge } from '../../../draggables';
import { TokensFlexItem } from './helpers';

interface Props {
  eventId: string;
  contextId: string;
  args: string | null | undefined;
  processTitle: string | null | undefined;
}

export const Args = pure<Props>(({ eventId, contextId, args, processTitle }) =>
  args != null ? (
    <TokensFlexItem grow={false} component="span">
      <DraggableBadge
        contextId={contextId}
        eventId={eventId}
        field="process.title"
        queryValue={processTitle != null ? processTitle : ''}
        value={args}
      />
    </TokensFlexItem>
  ) : null
);
