/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBasicTable,
  EuiButtonIcon,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import React from 'react';
import { InfraLogItem, InfraLogItemField } from '../../graphql/types';

interface Props {
  flyoutItem: InfraLogItem;
  showFlyout: (show: boolean) => void;
  setFilter: (filter: string) => void;
}

export const LogFlyout: React.SFC<Props> = ({ flyoutItem, showFlyout, setFilter }) => {
  const handleFilter = (field: InfraLogItemField) => () => {
    const filter = `${field.field}:"${field.value}"`;
    setFilter(filter);
  };

  const columns = [
    { field: 'field', name: 'Field', sortable: true },
    {
      field: 'value',
      name: 'Value',
      sortable: true,
      render: (name: string, item: InfraLogItemField) => (
        <span>
          <EuiToolTip content="Add Filter">
            <EuiButtonIcon
              color="text"
              iconType="filter"
              aria-label="Filter"
              onClick={handleFilter(item)}
            />
          </EuiToolTip>
          {item.value}
        </span>
      ),
    },
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
