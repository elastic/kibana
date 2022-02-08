/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiBetaBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { NavigateToPath, useTimefilter } from '../../../contexts/kibana';
import { MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';
import { basicResolvers } from '../../resolvers';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';
import { NodesList } from '../../../trained_models/nodes_overview';
import { MlPageHeader } from '../../../components/page_header';

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
            <EuiBetaBadge
              label={i18n.translate('xpack.ml.navMenu.trainedModelsTabBetaLabel', {
                defaultMessage: 'Technical preview',
              })}
              size="m"
              color="hollow"
              tooltipContent={i18n.translate(
                'xpack.ml.navMenu.trainedModelsTabBetaTooltipContent',
                {
                  defaultMessage:
                    'This functionality is in technical preview and may be changed or removed completely in a future release. Elastic will take a best effort approach to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.',
                }
              )}
              tooltipPosition={'right'}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </MlPageHeader>
      <NodesList />
    </PageLoader>
  );
};
