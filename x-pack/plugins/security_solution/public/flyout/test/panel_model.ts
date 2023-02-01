/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlyoutPanel } from '@kbn/expandable-flyout';

export interface RightPanel extends FlyoutPanel {
  id: 'right';
  params?: {
    id: string;
    indexName: string;
  };
}
export interface Right2Panel extends FlyoutPanel {
  id: 'right2';
  params?: {
    id: string;
    indexName: string;
  };
}

export interface LeftPanel extends FlyoutPanel {
  id: 'left';
  params?: {
    id: string;
    indexName: string;
  };
}

export interface Left2Panel extends FlyoutPanel {
  id: 'left2';
  params?: {
    id: string;
    indexName: string;
  };
}

export interface PreviewPanel extends FlyoutPanel {
  id: 'preview';
  params?: {
    id: string;
    indexName: string;
  };
}

export interface Preview2Panel extends FlyoutPanel {
  id: 'preview2';
  params?: {
    id: string;
    indexName: string;
  };
}
