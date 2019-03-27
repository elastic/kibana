/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { pure } from 'recompose';

import { DraggableBadge } from '../../../../draggables';

import { PrimarySecondaryUserInfo, TokensFlexItem } from '.';
import * as i18n from './translations';

interface Props {
  eventId: string;
  contextId: string;
  hostName: string | null | undefined;
  userName: string | null | undefined;
  primary: string | null | undefined;
  secondary: string | null | undefined;
  workingDirectory: string | null | undefined;
  session: string | null | undefined;
}

export const SessionUserHostWorkingDir = pure<Props>(
  ({ eventId, contextId, hostName, userName, primary, secondary, workingDirectory, session }) => (
    <>
      <TokensFlexItem grow={false} component="span">
        {i18n.SESSION}
      </TokensFlexItem>
      <TokensFlexItem grow={false} component="span">
        <DraggableBadge
          contextId={contextId}
          eventId={eventId}
          field="auditd.session"
          value={session}
          iconType="number"
        />
      </TokensFlexItem>
      <TokensFlexItem grow={false} component="span">
        <PrimarySecondaryUserInfo
          contextId={contextId}
          eventId={eventId}
          userName={userName}
          primary={primary}
          secondary={secondary}
        />
      </TokensFlexItem>
      {hostName != null && (
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
  )
);
