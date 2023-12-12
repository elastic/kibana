/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';
import { FlyoutDetail } from '../components/flyout_detail/flyout_detail';
import { LogExplorerFlyoutContentProps } from '../components/flyout_detail';
import { useLogExplorerControllerContext } from '../controller';

export const CustomFlyoutContent = (props: LogExplorerFlyoutContentProps) => {
  const {
    customizations: { flyout },
  } = useLogExplorerControllerContext();

  const renderCustomizedContent = useMemo(
    () => flyout?.renderContent?.(renderContent) ?? renderContent,
    [flyout]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {/* Apply custom Log Explorer detail */}
      {renderCustomizedContent(props)}
      {/* Restore default content */}
      <EuiHorizontalRule margin="xs" />
      <EuiFlexItem>{props.renderDefaultContent()}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

const renderContent = ({ actions, dataView, doc }: LogExplorerFlyoutContentProps) => (
  <>
    {/* Apply custom Log Explorer detail */}
    <EuiFlexItem>
      <FlyoutDetail actions={actions} dataView={dataView} doc={doc} />
    </EuiFlexItem>
  </>
);

// eslint-disable-next-line import/no-default-export
export default CustomFlyoutContent;
