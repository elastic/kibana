/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import { useDocDetail } from '../flyout_detail/use_doc_detail';
import { FlyoutDoc, LogDocument } from '../../controller';
import { LogLevel } from '../flyout_detail/sub_components/log_level';
import * as constants from '../../../common/constants';

const Content = ({ row, dataView }: DataGridCellValueElementProps) => {
  const parsedDoc = useDocDetail(row as LogDocument, { dataView });
  const { field, value } = getMessageWithFallbacks(parsedDoc);

  return (
    <EuiFlexGroup gutterSize="xs">
      <EuiFlexItem grow={false} css={{ minWidth: '80px' }}>
        <LogLevel
          level={parsedDoc[constants.LOG_LEVEL_FIELD] ?? '-'}
          iconType={parsedDoc[constants.LOG_LEVEL_FIELD] ? 'arrowDown' : undefined}
          iconSide="right"
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="xs">
          {field && (
            <EuiFlexItem grow={false}>
              <EuiText size="xs" css={{ fontWeight: 700 }}>
                {field}
              </EuiText>
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <EuiText size="xs">{value}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const renderContent = (props: DataGridCellValueElementProps) => {
  return <Content {...props} />;
};

const getMessageWithFallbacks = (doc: FlyoutDoc) => {
  const rankingOrder = [
    constants.MESSAGE_FIELD,
    constants.ERROR_MESSAGE_FIELD,
    constants.EVENT_ORIGINAL_FIELD,
  ] as const;

  for (const rank of rankingOrder) {
    if (doc[rank] !== undefined && doc[rank] !== null) {
      return { field: rank, value: doc[rank] };
    }
  }

  // If none of the ranks are present, return the whole object
  return { field: null, value: JSON.stringify(doc) };
};
