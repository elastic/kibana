/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FlyoutDoc } from './types';
import { getDocDetailHeaderRenderFlags } from './use_doc_detail';
import { LogLevel } from './sub_components/log_level';
import { Timestamp } from './sub_components/timestamp';
import * as constants from '../../../common/constants';
import { flyoutMessageLabel } from './translations';

export function FlyoutHeader({ doc }: { doc: FlyoutDoc }) {
  const { hasTimestamp, hasLogLevel, hasMessage, hasBadges, hasFlyoutHeader } =
    getDocDetailHeaderRenderFlags(doc);

  const logLevelAndTimestamp = (
    <EuiFlexItem grow={false}>
      {hasBadges && (
        <EuiFlexGroup responsive={false} gutterSize="m" justifyContent="flexEnd">
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
  );

  return hasFlyoutHeader ? (
    <EuiFlexGroup direction="column" gutterSize="none" data-test-subj="logExplorerFlyoutDetail">
      {hasMessage ? (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup
            direction="column"
            gutterSize="s"
            data-test-subj="logExplorerFlyoutLogMessage"
          >
            <EuiFlexItem>
              <EuiFlexGroup alignItems="flexEnd" gutterSize="none" justifyContent="spaceBetween">
                <EuiFlexItem grow={false}>
                  <EuiText color="subdued" size="xs">
                    {flyoutMessageLabel}
                  </EuiText>
                </EuiFlexItem>
                {logLevelAndTimestamp}
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiCodeBlock
                overflowHeight={100}
                paddingSize="m"
                isCopyable
                language="txt"
                fontSize="m"
              >
                {doc[constants.MESSAGE_FIELD]}
              </EuiCodeBlock>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      ) : (
        logLevelAndTimestamp
      )}
    </EuiFlexGroup>
  ) : null;
}
