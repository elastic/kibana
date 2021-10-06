/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { SavedObjectConflictMessageProps } from '../types';

export const getSavedObjectConflictMessage = async (): Promise<
  React.FC<SavedObjectConflictMessageProps>
> => {
  const { SavedObjectConflictMessage } = await import('./saved_object_conflict_message');
  return (props: SavedObjectConflictMessageProps) => {
    return <SavedObjectConflictMessage {...props} />;
  };
};
