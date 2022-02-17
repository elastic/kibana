/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiNotificationBadge, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { FC } from 'react';

export interface TotalFieldsStats {
  visibleFieldsCount: number;
  totalFieldsCount: number;
}

export interface TotalFieldsCountProps {
  fieldsCountStats?: TotalFieldsStats;
}

export const TotalFieldsCount: FC<TotalFieldsCountProps> = ({ fieldsCountStats }) => {
  if (
    !fieldsCountStats ||
    fieldsCountStats.visibleFieldsCount === undefined ||
    fieldsCountStats.totalFieldsCount === undefined
  )
    return null;

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      className="dvFieldCount__item"
      data-test-subj="dataVisualizerFieldsSummary"
      responsive={false}
    >
      <EuiFlexItem grow={false}>
        <EuiText>
          <h5>
            <FormattedMessage
              id="xpack.dataVisualizer.searchPanel.allFieldsLabel"
              defaultMessage="All fields"
            />
          </h5>
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiNotificationBadge
          color="subdued"
          size="m"
          data-test-subj="dataVisualizerVisibleFieldsCount"
        >
          <strong>{fieldsCountStats.visibleFieldsCount}</strong>
        </EuiNotificationBadge>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText color="subdued" size="s" data-test-subj="dataVisualizerTotalFieldsCount">
          <FormattedMessage
            id="xpack.dataVisualizer.searchPanel.ofFieldsTotal"
            defaultMessage="of {totalCount} total"
            values={{ totalCount: fieldsCountStats.totalFieldsCount }}
          />
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
