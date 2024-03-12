/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiLoadingLogo } from '@elastic/eui';
import { CoreStart } from '@kbn/core/public';
import { DatasetQualityPluginStart } from '@kbn/dataset-quality-plugin/public';
import { DatasetQualityController } from '@kbn/dataset-quality-plugin/public/controller';
import { OBSERVABILITY_LOGS_EXPLORER_APP_ID } from '@kbn/deeplinks-observability';
import { FormattedMessage } from '@kbn/i18n-react';
import { useLinkProps } from '@kbn/observability-shared-plugin/public';
import { useActor } from '@xstate/react';
import React from 'react';
import { ObservabilityLogsExplorerPageTemplate } from '../../components/page_template';
import {
  ObservabilityDatasetQualityPageStateProvider,
  useObservabilityDatasetQualityPageStateContext,
} from '../../state_machines/dataset_quality/src/provider';
import { useBreadcrumbs } from '../../utils/breadcrumbs';
import { useKbnUrlStateStorageFromRouterContext } from '../../utils/kbn_url_state_context';
import { useKibanaContextForPlugin } from '../../utils/use_kibana';

export interface DatasetQualityRouteProps {
  core: CoreStart;
}

export const DatasetQualityRoute = () => {
  const { services } = useKibanaContextForPlugin();
  const { datasetQuality, serverless, chrome, notifications } = services;
  const logsExplorerLinkProps = useLinkProps({ app: OBSERVABILITY_LOGS_EXPLORER_APP_ID });

  useBreadcrumbs(
    [
      {
        text: 'Datasets',
        ...logsExplorerLinkProps,
      },
    ],
    chrome,
    serverless
  );

  const urlStateStorageContainer = useKbnUrlStateStorageFromRouterContext();

  return (
    <ObservabilityDatasetQualityPageStateProvider
      createDatasetQualityController={(initialState) =>
        datasetQuality.createDatasetQualityController(initialState)
      }
      toasts={notifications.toasts}
      urlStateStorageContainer={urlStateStorageContainer}
    >
      <ConnectedContent />
    </ObservabilityDatasetQualityPageStateProvider>
  );
};

const ConnectedContent = React.memo(() => {
  const {
    services: { datasetQuality },
  } = useKibanaContextForPlugin();

  const [state] = useActor(useObservabilityDatasetQualityPageStateContext());

  if (state.matches('initialized')) {
    return (
      <InitializedContent
        datasetQualityController={state.context.controller}
        datasetQuality={datasetQuality}
      />
    );
  } else {
    return <InitializingContent />;
  }
});

const InitializingContent = React.memo(() => (
  <ObservabilityLogsExplorerPageTemplate>
    <EuiEmptyPrompt
      icon={<EuiLoadingLogo logo="logoKibana" size="xl" />}
      title={
        <FormattedMessage
          id="xpack.observabilityLogsExplorer.datasetQuality.InitializingTitle"
          defaultMessage="Initializing the Dataset Quality"
        />
      }
    />
  </ObservabilityLogsExplorerPageTemplate>
));

const InitializedContent = React.memo(
  ({
    datasetQuality,
    datasetQualityController,
  }: {
    datasetQuality: DatasetQualityPluginStart;
    datasetQualityController: DatasetQualityController;
  }) => {
    return (
      <ObservabilityLogsExplorerPageTemplate pageSectionProps={{ paddingSize: 'l' }}>
        <datasetQuality.DatasetQuality controller={datasetQualityController} />
      </ObservabilityLogsExplorerPageTemplate>
    );
  }
);
