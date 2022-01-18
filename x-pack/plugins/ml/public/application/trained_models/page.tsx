/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useLocation } from 'react-router-dom';
import { EuiBetaBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ModelsList } from './models_management';
import { TrainedModelsNavigationBar } from './navigation_bar';
import { NodesList } from './nodes_overview';
import { MlPageHeader } from '../components/page_header';

export const Page: FC = () => {
  const location = useLocation();
  const selectedTabId = useMemo(() => location.pathname.split('/').pop(), [location]);

  return (
    <>
      <MlPageHeader>
        <EuiFlexGroup responsive={false} wrap={false} alignItems={'center'} gutterSize={'m'}>
          <EuiFlexItem grow={false}>
            <FormattedMessage
              id="xpack.ml.trainedModels.modelManagementHeader"
              defaultMessage="Model Management"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBetaBadge
              label={i18n.translate('xpack.ml.navMenu.trainedModelsTabBetaLabel', {
                defaultMessage: 'Experimental',
              })}
              size="m"
              color="hollow"
              tooltipContent={i18n.translate(
                'xpack.ml.navMenu.trainedModelsTabBetaTooltipContent',
                {
                  defaultMessage:
                    "Model Management is an experimental feature and subject to change. We'd love to hear your feedback.",
                }
              )}
              tooltipPosition={'right'}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </MlPageHeader>

      <TrainedModelsNavigationBar selectedTabId={selectedTabId} />
      {selectedTabId === 'trained_models' ? <ModelsList /> : null}
      {selectedTabId === 'nodes' ? <NodesList /> : null}
    </>
  );
};
