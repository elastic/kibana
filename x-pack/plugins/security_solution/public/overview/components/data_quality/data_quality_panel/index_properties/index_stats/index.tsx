/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiStat, EuiToolTip } from '@elastic/eui';
import React from 'react';

import * as i18n from './translations';

interface Props {
  docsCount: number;
  indexName: string;
  pattern: string;
}

const IndexStatsComponent: React.FC<Props> = ({ docsCount, indexName, pattern }) => (
  <EuiFlexGroup gutterSize="none" alignItems="center" justifyContent="spaceBetween">
    <EuiFlexItem grow={false}>
      <EuiToolTip content={i18n.INDEX_TOOL_TIP(pattern)}>
        <span aria-roledescription={i18n.INDEX_NAME_LABEL}>{indexName}</span>
      </EuiToolTip>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiToolTip content={i18n.INDEX_DOCS_COUNT_TOOL_TIP(indexName)}>
        <EuiStat description={i18n.DOCS_COUNT_LABEL} reverse title={docsCount} titleSize="xs" />
      </EuiToolTip>
    </EuiFlexItem>
  </EuiFlexGroup>
);

IndexStatsComponent.displayName = 'IndexStatsComponent';

export const IndexStats = React.memo(IndexStatsComponent);
