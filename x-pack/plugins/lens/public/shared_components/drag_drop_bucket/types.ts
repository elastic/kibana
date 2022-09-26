/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DraggableProvided } from 'react-beautiful-dnd';

export interface BucketContainerProps {
  invalidMessage: string;
  onRemoveClick: () => void;
  children: React.ReactNode;
  removeTitle: string;
  draggableProvided?: DraggableProvided;
  isInvalid?: boolean;
  isNotRemovable?: boolean;
  isNotDraggable?: boolean;
  'data-test-subj'?: string;
}
