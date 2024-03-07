/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DocViewRenderProps } from '@kbn/unified-doc-viewer/src/services/types';
import { LogDocument } from '../../common/document';
import { LogsExplorerControllerContext } from '../state_machines/logs_explorer_controller';

export type RenderPreviousContent<Props> = (props: Props) => React.ReactNode;

export type RenderContentCustomization<Props> = (
  renderPreviousContent: RenderPreviousContent<Props>
) => (props: Props) => React.ReactNode;

export interface LogsExplorerFlyoutContentProps {
  actions: {
    addFilter: DocViewRenderProps['filter'];
    addColumn: DocViewRenderProps['onAddColumn'];
    removeColumn: DocViewRenderProps['onRemoveColumn'];
  };
  dataView: DocViewRenderProps['dataView'];
  doc: LogDocument;
}

export type OnUknownDataViewSelectionHandler = (context: LogsExplorerControllerContext) => void;

export interface LogsExplorerCustomizationEvents {
  onUknownDataViewSelection?: OnUknownDataViewSelectionHandler;
}

export interface LogsExplorerCustomizations {
  flyout?: {
    renderContent?: RenderContentCustomization<LogsExplorerFlyoutContentProps>;
  };
  events?: LogsExplorerCustomizationEvents;
}
