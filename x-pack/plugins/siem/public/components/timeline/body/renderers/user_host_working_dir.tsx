/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { pure } from 'recompose';

import { DraggableBadge } from '../../../draggables';
import { TokensFlexItem } from './helpers';
import { HostWorkingDir } from './host_working_dir';

interface Props {
  contextId: string;
  eventId: string;
  userName: string | null | undefined;
  hostName: string | null | undefined;
  workingDirectory: string | null | undefined;
}

export const UserHostWorkingDir = pure<Props>(
  ({ contextId, eventId, userName, hostName, workingDirectory }) =>
    userName != null || hostName != null || workingDirectory != null ? (
      <>
        <TokensFlexItem grow={false} component="span">
          <DraggableBadge
            contextId={contextId}
            eventId={eventId}
            field="user.name"
            value={userName}
            iconType="user"
          />
        </TokensFlexItem>
        {hostName != null && userName != null && (
          <TokensFlexItem grow={false} component="span">
            @
          </TokensFlexItem>
        )}
        <HostWorkingDir
          contextId={contextId}
          eventId={eventId}
          hostName={hostName}
          workingDirectory={workingDirectory}
        />
      </>
    ) : null
);
