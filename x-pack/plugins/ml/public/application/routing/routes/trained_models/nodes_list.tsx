/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiTab, EuiTabs } from '@elastic/eui';
import { useTimefilter } from '@kbn/ml-date-picker';
import { NavigateToPath } from '../../../contexts/kibana';
import { MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';
import { basicResolvers } from '../../resolvers';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';
import { NodesList } from '../../../trained_models/nodes_overview';
import { MlPageHeader } from '../../../components/page_header';
import { TechnicalPreviewBadge } from '../../../components/technical_preview_badge';
import { JobMemoryTreeMap } from '../../../trained_models/memory_tree_map';

enum TAB {
  NODE,
  TREE,
}

export const nodesListRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  path: '/trained_models/nodes',
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  title: i18n.translate('xpack.ml.modelManagement.nodesOverview.docTitle', {
    defaultMessage: 'Nodes',
  }),
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('TRAINED_MODELS', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.trainedModelsBreadcrumbs.nodeOverviewLabel', {
        defaultMessage: 'Nodes',
      }),
    },
  ],
  enableDatePicker: true,
});

const PageWrapper: FC<PageProps> = ({ location, deps }) => {
  const { context } = useResolver(
    undefined,
    undefined,
    deps.config,
    deps.dataViewsContract,
    basicResolvers(deps)
  );
  const [selectedTab, setSelectedTab] = useState<TAB>(TAB.NODE);
  useTimefilter({ timeRangeSelector: false, autoRefreshSelector: true });
  return (
    <PageLoader context={context}>
      <MlPageHeader>
        <EuiFlexGroup responsive={false} wrap={false} alignItems={'center'} gutterSize={'m'}>
          <EuiFlexItem grow={false}>
            <FormattedMessage
              id="xpack.ml.modelManagement.nodesOverviewHeader"
              defaultMessage="Nodes"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <TechnicalPreviewBadge />
          </EuiFlexItem>
        </EuiFlexGroup>
      </MlPageHeader>

      <EuiTabs>
        <EuiTab
          isSelected={selectedTab === TAB.NODE}
          onClick={() => setSelectedTab(TAB.NODE)}
          data-test-subj="mlJobMgmtExportJobsADTab"
        >
          <FormattedMessage id="xpack.ml.importExport.exportFlyout.adTab" defaultMessage="Nodes" />
        </EuiTab>
        <EuiTab
          isSelected={selectedTab === TAB.TREE}
          onClick={() => setSelectedTab(TAB.TREE)}
          data-test-subj="mlJobMgmtExportJobsADTab"
        >
          <FormattedMessage id="xpack.ml.importExport.exportFlyout.adTab" defaultMessage="Memory" />
        </EuiTab>
      </EuiTabs>
      {selectedTab === TAB.NODE ? <NodesList /> : <JobMemoryTreeMap height="400px" />}
    </PageLoader>
  );
};
