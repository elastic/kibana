/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { FlyoutDetail } from '../components/flyout_detail/flyout_detail';
import { FlyoutProps } from '../components/flyout_detail';
import { useLogExplorerCustomizationsContext } from '../hooks/use_log_explorer_customizations';

export const CustomFlyoutContent = ({
  filter,
  onAddColumn,
  onRemoveColumn,
  dataView,
  hit: doc,
}: FlyoutProps) => {
  const { flyout } = useLogExplorerCustomizationsContext();

  const actions = useMemo(
    () => ({
      addFilter: filter,
      addColumn: onAddColumn,
      removeColumn: onRemoveColumn,
    }),
    [filter, onAddColumn, onRemoveColumn]
  );

  const renderPreviousContent = useCallback(
    () => (
      <>
        {/* Apply custom Log Explorer detail */}
        <EuiFlexItem>
          <FlyoutDetail actions={actions} dataView={dataView} doc={doc} />
        </EuiFlexItem>
      </>
    ),
    [actions, dataView, doc]
  );

  const content = flyout?.renderContent
    ? flyout?.renderContent(renderPreviousContent, { doc })
    : renderPreviousContent();

  return (
    <>
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="column">
        {/* Apply custom Log Explorer detail */}
        {content}
      </EuiFlexGroup>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export default CustomFlyoutContent;
