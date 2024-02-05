/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexItem } from '@elastic/eui';
import {
  LogsExplorerCustomizations,
  LogsExplorerFlyoutContentProps,
} from '@kbn/logs-explorer-plugin/public';
import type { LogAIAssistantDocument } from '@kbn/logs-shared-plugin/public';
import React, { useMemo } from 'react';
import { useKibanaContextForPlugin } from '../utils/use_kibana';

type RenderFlyoutContentCustomization =
  Required<LogsExplorerCustomizations>['flyout']['renderContent'];

const ObservabilityLogAIAssistant = ({ doc }: LogsExplorerFlyoutContentProps) => {
  const { services } = useKibanaContextForPlugin();
  const { LogAIAssistant } = services.logsShared;

  const mappedDoc = useMemo(() => mapDocToAIAssistantFormat(doc), [doc]);

  return <LogAIAssistant key={doc.id} doc={mappedDoc} />;
};

export const renderFlyoutContent: RenderFlyoutContentCustomization =
  (renderPreviousContent) => (props) => {
    return (
      <>
        {renderPreviousContent(props)}
        <EuiFlexItem>
          <ObservabilityLogAIAssistant {...props} />
        </EuiFlexItem>
      </>
    );
  };

/**
 * Utils
 */
const mapDocToAIAssistantFormat = (doc: LogsExplorerFlyoutContentProps['doc']) => {
  if (!doc) return;

  return {
    fields: Object.entries(doc.flattened).map(([field, value]) => ({
      field,
      value,
    })) as LogAIAssistantDocument['fields'],
  };
};
