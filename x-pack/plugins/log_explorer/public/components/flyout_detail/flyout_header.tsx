/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FlyoutDoc } from './types';
import { getDocDetailHeaderRenderFlags } from './use_doc_detail';
import { LogLevel } from './sub_components/log_level';
import { Timestamp } from './sub_components/timestamp';
import { Message } from './sub_components/message';
import * as constants from '../../../common/constants';

export function FlyoutHeader({ doc }: { doc: FlyoutDoc }) {
  const { hasTimestamp, hasLogLevel, hasMessage, hasBadges, hasFlyoutHeader } =
    getDocDetailHeaderRenderFlags(doc);

  return hasFlyoutHeader ? (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="logExplorerFlyoutDetail">
      <EuiFlexItem grow={false}>
        {hasBadges && (
          <EuiFlexGroup responsive={false} gutterSize="m">
            {hasLogLevel && (
              <EuiFlexItem grow={false}>
                <LogLevel level={doc[constants.LOG_LEVEL_FIELD]} />
              </EuiFlexItem>
            )}
            {hasTimestamp && (
              <EuiFlexItem grow={false}>
                <Timestamp timestamp={doc[constants.TIMESTAMP_FIELD]} />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        )}
      </EuiFlexItem>
      {hasMessage && (
        <EuiFlexItem grow={false}>
          <Message message={doc[constants.MESSAGE_FIELD]} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  ) : null;
}
