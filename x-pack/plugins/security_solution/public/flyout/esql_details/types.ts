/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlyoutPanelProps, PanelPath } from '@kbn/expandable-flyout';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { ESQLDetailsPanelKey } from './constants';

export interface ESQLDetailsPanelProps extends FlyoutPanelProps {
  key: typeof ESQLDetailsPanelKey;
  path?: PanelPath;
  params: {
    scopeId: string;
    data: DataTableRecord;
    isPreviewMode?: boolean;
  };
}
