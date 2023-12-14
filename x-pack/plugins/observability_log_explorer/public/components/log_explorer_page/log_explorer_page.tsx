/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiEmptyPrompt, EuiLoadingLogo, EuiResizableContainer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  LogExplorerController,
  LogExplorerPluginStart,
} from '@kbn/log-explorer-plugin/public';
import { useActor } from '@xstate/react';
import React from 'react';
import { useObservabilityLogExplorerPageStateContext } from '../../state_machines/observability_log_explorer/src';
import { ObservabilityLogExplorerHistory } from '../../types';
import { useKibanaContextForPlugin } from '../../utils/use_kibana';
import { DatasetQualitySidebar } from '../dataset_quality_sidebar';
import { ObservabilityLogExplorerPageTemplate } from '../shared/page_template';

export const ConnectedLogExplorerPage = React.memo(() => {
  const {
    services: {
      appParams: { history },
      logExplorer,
    },
  } = useKibanaContextForPlugin();

  const [state] = useActor(useObservabilityLogExplorerPageStateContext());

  if (state.matches('initialized')) {
    return (
      <InitializedContent
        logExplorerController={state.context.controller}
        history={history}
        logExplorer={logExplorer}
      />
    );
  } else {
    return <InitializingContent />;
  }
});

const InitializingContent = React.memo(() => (
  <ObservabilityLogExplorerPageTemplate>
    <EuiEmptyPrompt
      icon={<EuiLoadingLogo logo="logoKibana" size="xl" />}
      title={
        <FormattedMessage
          id="xpack.observabilityLogExplorer.InitializingTitle"
          defaultMessage="Initializing the Log Explorer"
        />
      }
    />
  </ObservabilityLogExplorerPageTemplate>
));

const InitializedContent = React.memo(
  ({
    history,
    logExplorer,
    logExplorerController,
  }: {
    history: ObservabilityLogExplorerHistory;
    logExplorer: LogExplorerPluginStart;
    logExplorerController: LogExplorerController;
  }) => {
    return (
      <ObservabilityLogExplorerPageTemplate>
        <EuiResizableContainer>
          {(EuiResizablePanel, EuiResizableButton) => (
            <>
              <EuiResizablePanel grow initialSize={61.8} paddingSize="none">
                <logExplorer.LogExplorer
                  controller={logExplorerController}
                  scopedHistory={history}
                />
              </EuiResizablePanel>
              <EuiResizableButton />
              <EuiResizablePanel initialSize={38.2} minSize="200px" color="subdued">
                <DatasetQualitySidebar />
              </EuiResizablePanel>
            </>
          )}
        </EuiResizableContainer>
      </ObservabilityLogExplorerPageTemplate>
    );
  }
);
