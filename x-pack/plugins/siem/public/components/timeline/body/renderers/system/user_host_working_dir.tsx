/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { pure } from 'recompose';

import { TokensFlexItem } from '..';
import { DraggableBadge } from '../../../../draggables';

import * as i18n from './translations';

interface Props {
  contextId: string;
  eventId: string;
  userName: string | null | undefined;
  hostName: string | null | undefined;
  workingDirectory: string | null | undefined;
}

// TODO: Refactor this so it can be shared with other components

export const UserHostWorkingDir = pure<Props>(
  ({ contextId, eventId, userName, hostName, workingDirectory }) => {
    return (
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
        <TokensFlexItem grow={false} component="span">
          <DraggableBadge
            contextId={contextId}
            eventId={eventId}
            field="host.name"
            value={hostName}
          />
        </TokensFlexItem>
        {workingDirectory != null && (
          <TokensFlexItem grow={false} component="span">
            {i18n.IN}
          </TokensFlexItem>
        )}
        <TokensFlexItem grow={false} component="span">
          <DraggableBadge
            contextId={contextId}
            eventId={eventId}
            field="process.working_directory"
            value={workingDirectory}
            iconType="folderOpen"
          />
        </TokensFlexItem>
      </>
    );
  }
);
