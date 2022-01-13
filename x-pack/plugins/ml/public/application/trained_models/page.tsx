/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useLocation } from 'react-router-dom';
import { ModelsList } from './models_management';
import { TrainedModelsNavigationBar } from './navigation_bar';
import { NodesList } from './nodes_overview';
import { MlPageHeader } from '../components/page_header';

export const Page: FC = () => {
  const location = useLocation();
  const selectedTabId = useMemo(() => location.pathname.split('/').pop(), [location]);

  return (
    <>
      <TrainedModelsNavigationBar selectedTabId={selectedTabId} />
      {selectedTabId === 'trained_models' ? <ModelsList /> : null}
      {selectedTabId === 'nodes' ? (
        <>
          <MlPageHeader>
            <FormattedMessage
              id="xpack.ml.trainedModels.nodesList.header"
              defaultMessage="Nodes overview"
            />
          </MlPageHeader>
          <NodesList />
        </>
      ) : null}
    </>
  );
};
