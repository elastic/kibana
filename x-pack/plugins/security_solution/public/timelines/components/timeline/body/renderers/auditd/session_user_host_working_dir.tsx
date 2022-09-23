/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { DraggableBadge } from '../../../../../../common/components/draggables';

import * as i18n from './translations';
import { TokensFlexItem } from '../helpers';
import { HostWorkingDir } from '../host_working_dir';
import { PrimarySecondaryUserInfo } from './primary_secondary_user_info';

interface Props {
  eventId: string;
  contextId: string;
  hostName: string | null | undefined;
  userName: string | null | undefined;
  primary: string | null | undefined;
  secondary: string | null | undefined;
  workingDirectory: string | null | undefined;
  session: string | null | undefined;
  isDraggable?: boolean;
}

export const SessionUserHostWorkingDir = React.memo<Props>(
  ({
    eventId,
    contextId,
    hostName,
    userName,
    primary,
    secondary,
    workingDirectory,
    session,
    isDraggable,
  }) => (
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
          isDraggable={isDraggable}
          isAggregatable={true}
          fieldType="keyword"
        />
      </TokensFlexItem>
      <TokensFlexItem grow={false} component="span">
        <PrimarySecondaryUserInfo
          contextId={contextId}
          eventId={eventId}
          userName={userName}
          primary={primary}
          secondary={secondary}
          isDraggable={isDraggable}
        />
      </TokensFlexItem>
      {hostName != null && (
        <TokensFlexItem grow={false} component="span">
          {'@'}
        </TokensFlexItem>
      )}
      <HostWorkingDir
        contextId={contextId}
        eventId={eventId}
        workingDirectory={workingDirectory}
        hostName={hostName}
        isDraggable={isDraggable}
      />
    </>
  )
);

SessionUserHostWorkingDir.displayName = 'SessionUserHostWorkingDir';
