/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FlyoutContentProps } from '@kbn/discover-plugin/public';
import { LogLevel } from './sub_components/log_level';
import { Timestamp } from './sub_components/timestamp';
import { LogDocument } from './types';
import { getDocDetailRenderFlags, useDocDetail } from './use_doc_detail';
import { Message } from './sub_components/message';

export function FlyoutDetail({
  dataView,
  doc,
}: Pick<FlyoutContentProps, 'dataView' | 'doc' | 'actions'>) {
  const parsedDoc = useDocDetail(doc as LogDocument, { dataView });

  const { hasTimestamp, hasLogLevel, hasMessage, hasBadges, hasFlyoutHeader } =
    getDocDetailRenderFlags(parsedDoc);

  return hasFlyoutHeader ? (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="logExplorerFlyoutDetail">
      <EuiFlexItem grow={false}>
        {hasBadges && (
          <EuiFlexGroup responsive={false} gutterSize="m">
            {hasLogLevel && (
              <EuiFlexItem grow={false}>
                <LogLevel level={parsedDoc['log.level']} />
              </EuiFlexItem>
            )}
            {hasTimestamp && (
              <EuiFlexItem grow={false}>
                <Timestamp timestamp={parsedDoc['@timestamp']} />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        )}
      </EuiFlexItem>
      {hasMessage && (
        <EuiFlexItem grow={false}>
          <Message message={parsedDoc.message} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  ) : null;
}
