/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiAvatar } from '@elastic/eui';
import { AuthenticatedUser } from '@kbn/core/public';
import React from 'react';
import { useTheme } from '../../hooks/use_theme';
import { TimelineMessage } from '../timeline_message';

export function NoteWidget({
  user,
  note,
  onDelete,
}: {
  user: Pick<AuthenticatedUser, 'username' | 'full_name'>;
  note: string;
  onChange: (note: string) => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  return (
    <TimelineMessage
      icon={<EuiAvatar name={user.username} size="s" />}
      color={theme.colors.emptyShade}
      content={note}
      onDelete={onDelete}
    />
  );
}
