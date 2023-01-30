/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo, useState } from 'react';
import { useTimefilter } from '@kbn/ml-date-picker';
import { EuiFlexGroup, EuiFlexItem, EuiTabs, EuiTab } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { isServerless } from '../../../common/util/serverless';
import { NodesList } from './nodes_overview';
import { MlPageHeader } from '../components/page_header';
import { JobMemoryTreeMap } from './memory_tree_map';

enum TAB {
  NODES,
  MEMORY_USAGE,
}

export const MemoryUsagePage: FC = () => {
  const [selectedTab, setSelectedTab] = useState<TAB>(TAB.NODES);
  useTimefilter({ timeRangeSelector: false, autoRefreshSelector: true });

  const serverless = useMemo(() => isServerless(), []);

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

      {serverless ? (
        <JobMemoryTreeMap />
      ) : (
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
          {selectedTab === TAB.NODES ? <NodesList /> : <JobMemoryTreeMap />}
        </>
      )}
    </>
  );
};
