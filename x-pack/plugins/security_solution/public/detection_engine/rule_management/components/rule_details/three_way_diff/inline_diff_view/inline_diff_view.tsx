/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DiffView } from '../../json_diff/diff_view';
import type { DiffMethod } from '../../json_diff/mark_edits';

export interface InlineDiffViewProps {
  oldSource: string;
  newSource: string;
  diffMethod?: DiffMethod;
}

export function InlineDiffView({ oldSource, newSource, diffMethod }: InlineDiffViewProps) {
  return (
    <DiffView
      viewType="unified"
      oldSource={oldSource}
      newSource={newSource}
      diffMethod={diffMethod}
    />
  );
}
