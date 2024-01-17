/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { FlyoutDetail } from '../components/flyout_detail/flyout_detail';
import { LogExplorerFlyoutContentProps } from '../components/flyout_detail';
import { LogDocument, useLogExplorerControllerContext } from '../controller';

const CustomFlyoutContent = ({
  filter,
  onAddColumn,
  onRemoveColumn,
  dataView,
  hit,
}: DocViewRenderProps) => {
  const {
    customizations: { flyout },
  } = useLogExplorerControllerContext();

  const flyoutContentProps: LogExplorerFlyoutContentProps = useMemo(
    () => ({
      actions: {
        addFilter: filter,
        addColumn: onAddColumn,
        removeColumn: onRemoveColumn,
      },
      dataView,
      doc: hit as LogDocument,
    }),
    [filter, onAddColumn, onRemoveColumn, dataView, hit]
  );

  const renderCustomizedContent = useMemo(
    () => flyout?.renderContent?.(renderContent) ?? renderContent,
    [flyout]
  );

  return (
    <>
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="column">
        {/* Apply custom Log Explorer detail */}
        {renderCustomizedContent(flyoutContentProps)}
      </EuiFlexGroup>
    </>
  );
};

const renderContent = ({ actions, dataView, doc }: LogExplorerFlyoutContentProps) => (
  <EuiFlexItem>
    <FlyoutDetail actions={actions} dataView={dataView} doc={doc} />
  </EuiFlexItem>
);

// eslint-disable-next-line import/no-default-export
export default CustomFlyoutContent;
