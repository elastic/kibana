/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataTableRecord } from '@kbn/discover-utils/types';

export type RenderPreviousContent = () => React.ReactNode;

export interface LogExplorerFlyoutContentProps {
  doc: DataTableRecord;
}

export type FlyoutRenderContent = (
  renderPreviousContent: RenderPreviousContent,
  props: LogExplorerFlyoutContentProps
) => React.ReactNode;

export interface LogExplorerCustomizations {
  flyout?: {
    renderContent?: FlyoutRenderContent;
  };
}
