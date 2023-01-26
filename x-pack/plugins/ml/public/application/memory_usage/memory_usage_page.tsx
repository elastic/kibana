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
import { NodesList } from '../trained_models/nodes_overview';
import { MlPageHeader } from '../components/page_header';
import { TechnicalPreviewBadge } from '../components/technical_preview_badge';
import { JobMemoryTreeMap } from '../trained_models/memory_tree_map';

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
              id="xpack.ml.modelManagement.memoryUsageHeader"
              defaultMessage="Memory Usage"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <TechnicalPreviewBadge />
          </EuiFlexItem>
        </EuiFlexGroup>
      </MlPageHeader>

      {serverless ? (
        <JobMemoryTreeMap height="400px" />
      ) : (
        <>
          <EuiTabs>
            <EuiTab
              isSelected={selectedTab === TAB.NODES}
              onClick={() => setSelectedTab(TAB.NODES)}
            >
              <FormattedMessage id="xpack.ml.modelManagement.nodesTab" defaultMessage="Nodes" />
            </EuiTab>
            <EuiTab
              isSelected={selectedTab === TAB.MEMORY_USAGE}
              onClick={() => setSelectedTab(TAB.MEMORY_USAGE)}
            >
              <FormattedMessage
                id="xpack.ml.modelManagement.memoryTab"
                defaultMessage="Memory usage"
              />
            </EuiTab>
          </EuiTabs>
          {selectedTab === TAB.NODES ? <NodesList /> : <JobMemoryTreeMap height="400px" />}
        </>
      )}
    </>
  );
};
