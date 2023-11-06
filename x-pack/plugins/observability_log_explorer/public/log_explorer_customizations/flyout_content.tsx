/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  LogExplorerCustomizations,
  LogExplorerFlyoutContentProps,
} from '@kbn/log-explorer-plugin/public';
import React from 'react';
import { useKibanaContextForPlugin } from '../utils/use_kibana';

const ObservabilityLogAIAssistant = ({ doc }: LogExplorerFlyoutContentProps) => {
  const { services } = useKibanaContextForPlugin();
  const { LogAIAssistant } = services.logsShared;

  return <LogAIAssistant />;
};

export const renderFlyoutContent: Required<LogExplorerCustomizations>['flyout']['renderContent'] = (
  renderPreviousContent,
  props
) => {
  return (
    <>
      {renderPreviousContent()}
      <ObservabilityLogAIAssistant {...props} />
    </>
  );
};
