/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AuthenticatedUser } from '@kbn/core/public';
import type { GlobalWidgetParameters, OnWidgetAdd } from '@kbn/investigate-plugin/public';
import React from 'react';
import { NoteWidgetControl } from '../note_widget_control';

type AddWidgetUIProps = {
  user: Pick<AuthenticatedUser, 'full_name' | 'username'>;
  onWidgetAdd: OnWidgetAdd;
} & GlobalWidgetParameters;

export function AddNoteUI({ user, onWidgetAdd }: AddWidgetUIProps) {
  return <NoteWidgetControl user={user} onWidgetAdd={onWidgetAdd} />;
}
