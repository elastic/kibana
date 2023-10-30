/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FlyoutDetail } from '../components/flyout_detail/flyout_detail';
import { FlyoutProps } from '../components/flyout_detail';

export const CustomFlyoutContent = ({
  actions,
  dataView,
  doc,
  renderDefaultContent,
}: FlyoutProps) => {
  return (
    <EuiFlexGroup direction="column">
      {/* Apply custom Log Explorer detail */}
      <EuiFlexItem>
        <FlyoutDetail actions={actions} dataView={dataView} doc={doc} />
      </EuiFlexItem>
      {/* Restore default content */}
      <EuiFlexItem>{renderDefaultContent()}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

// eslint-disable-next-line import/no-default-export
export default CustomFlyoutContent;
