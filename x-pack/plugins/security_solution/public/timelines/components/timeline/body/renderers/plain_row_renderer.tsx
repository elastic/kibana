/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { RowRendererId, RowRenderer } from '../../../../../../common/types/timeline';

const PlainRowRenderer = () => <></>;

PlainRowRenderer.displayName = 'PlainRowRenderer';

export const plainRowRenderer: RowRenderer = {
  id: RowRendererId.plain,
  isInstance: (_) => true,
  renderRow: PlainRowRenderer,
};
