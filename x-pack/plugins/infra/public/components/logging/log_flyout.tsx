/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBasicTable, EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import React from 'react';
import { InfraLogItem } from '../../graphql/types';

interface Props {
  flyoutItem: InfraLogItem;
  showFlyout: (show: boolean) => void;
}

export const LogFlyout: React.SFC<Props> = ({ flyoutItem, showFlyout }) => {
  const columns = [
    { field: 'field', name: 'Field', sortable: true },
    { field: 'value', name: 'Value', sortable: true },
  ];
  return (
    <EuiFlyout onClose={() => showFlyout(false)} size="m">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h3 id="flyoutTitle">Log event document details</h3>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiBasicTable columns={columns} items={flyoutItem.fields} />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
