/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTab, EuiTabs } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { mlTimefilterRefresh$, useTimefilter } from '@kbn/ml-date-picker';
import type { FC } from 'react';
import React, { useCallback, useState } from 'react';
import { MlPageHeader } from '../components/page_header';
import { SavedObjectsWarning } from '../components/saved_objects_warning';
import { useEnabledFeatures } from '../contexts/ml';
import { JobMemoryTreeMap, MemoryPage } from './memory_tree_map';
import { NodesList } from './nodes_overview';

enum TAB {
  NODES,
  MEMORY_USAGE,
}

export const MemoryUsagePage: FC = () => {
  const [selectedTab, setSelectedTab] = useState<TAB>(TAB.NODES);
  useTimefilter({ timeRangeSelector: false, autoRefreshSelector: true });

  const { showNodeInfo } = useEnabledFeatures();

  const refresh = useCallback(() => {
    mlTimefilterRefresh$.next({
      lastRefresh: Date.now(),
    });
  }, []);

  return (
    <>
      <MlPageHeader>
        <EuiFlexGroup responsive={false} wrap={false} alignItems={'center'} gutterSize={'m'}>
          <EuiFlexItem grow={false}>
            <FormattedMessage
              id="xpack.ml.memoryUsage.memoryUsageHeader"
              defaultMessage="Memory Usage"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </MlPageHeader>

      <SavedObjectsWarning onCloseFlyout={refresh} />

      {showNodeInfo ? (
        <>
          <EuiTabs>
            <EuiTab
              isSelected={selectedTab === TAB.NODES}
              onClick={() => setSelectedTab(TAB.NODES)}
            >
              <FormattedMessage id="xpack.ml.memoryUsage.nodesTab" defaultMessage="Nodes" />
            </EuiTab>
            <EuiTab
              isSelected={selectedTab === TAB.MEMORY_USAGE}
              onClick={() => setSelectedTab(TAB.MEMORY_USAGE)}
            >
              <FormattedMessage id="xpack.ml.memoryUsage.memoryTab" defaultMessage="Memory usage" />
            </EuiTab>
          </EuiTabs>
          {selectedTab === TAB.NODES ? <NodesList /> : <MemoryPage />}
        </>
      ) : (
        <JobMemoryTreeMap />
      )}
    </>
  );
};
