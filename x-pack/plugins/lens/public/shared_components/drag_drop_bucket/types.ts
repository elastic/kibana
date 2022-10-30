/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DraggableProvided } from 'react-beautiful-dnd';

export interface BucketContainerProps {
  children: React.ReactNode;
  removeTitle: string;
  idx: number;
  onRemoveClick: () => void;
  isDragging?: boolean;
  draggableProvided?: DraggableProvided;
  isInvalid?: boolean;
  invalidMessage?: string;
  isNotRemovable?: boolean;
  isNotDraggable?: boolean;
  'data-test-subj'?: string;
}
