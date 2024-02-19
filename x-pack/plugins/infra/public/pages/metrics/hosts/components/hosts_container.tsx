/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useActor } from '@xstate/react';
import { EuiSpacer } from '@elastic/eui';
import { Filter, TimeRange } from '@kbn/es-query';
import { InvalidStateCallout } from '../../../../observability_logs/xstate_helpers';
import { InfraLoadingPanel } from '../../../../components/loading';
import { HostsContent } from './hosts_content';
import { ErrorCallout } from './error_callout';
import { useHostsViewPageStateContext } from '../machines/page_state/provider';
import { HostsViewPageState } from '../machines/page_state/state_machine';
import { UnifiedSearchBar } from './search_bar/unified_search_bar';
import { HostsViewProvider } from '../hooks/use_hosts_view';
import { HostsViewPageCallbacks } from '../machines/page_state/types';
import { ControlPanels } from '../machines/query_state';

export const HostContainer = () => {
  const hostsViewPageStateService = useHostsViewPageStateContext();
  const [hostsViewPageState, hostsViewPageSend] = useActor(hostsViewPageStateService);

  const pageStateCallbacks = useMemo(() => {
    return {
      updateControlPanels: (controlPanels: ControlPanels) => {
        hostsViewPageSend({
          type: 'UPDATE_CONTROL_PANELS',
          controlPanels,
        });
      },
      updateControlPanelFilters: (panelFilters: Filter[]) => {
        hostsViewPageSend({
          type: 'PANEL_FILTERS_CHANGED',
          panelFilters,
        });
      },
      updateTimeRange: (timeRange: TimeRange) => {
        hostsViewPageSend({
          type: 'UPDATE_TIME_RANGE',
          timeRange,
        });
      },
    };
  }, [hostsViewPageSend]);

  return (
    <HostsViewPageContentForState
      hostsViewPageState={hostsViewPageState}
      hostsViewPageCallbacks={pageStateCallbacks}
    />
  );
};

const HostsViewPageContentForState = ({
  hostsViewPageState,
  hostsViewPageCallbacks,
}: {
  hostsViewPageState: HostsViewPageState;
  hostsViewPageCallbacks: HostsViewPageCallbacks;
}) => {
  if (
    hostsViewPageState.matches('uninitialized') ||
    hostsViewPageState.matches({ hasDataViewIndices: 'uninitialized' }) ||
    hostsViewPageState.matches('loadingDataView')
  ) {
    return (
      <InfraLoadingPanel
        height="100%"
        width="auto"
        text={i18n.translate('xpack.infra.waffle.loadingDataText', {
          defaultMessage: 'Loading data',
        })}
      />
    );
  } else if (hostsViewPageState.matches('loadingDataViewFailed')) {
    return (
      <ErrorCallout
        error={hostsViewPageState.context.dataViewError}
        titleOverride={i18n.translate(
          'xpack.infra.hostsViewPage.errorOnCreateOrLoadDataviewTitle',
          {
            defaultMessage: 'Error creating Data View',
          }
        )}
        messageOverride={i18n.translate('xpack.infra.hostsViewPage.errorOnCreateOrLoadDataview', {
          defaultMessage:
            'There was an error trying to create a Data View: {metricAlias}. Try reloading the page.',
          values: { metricAlias: hostsViewPageState.context.indexPattern },
        })}
        hasTryAgainButton
      />
    );
  } else if (hostsViewPageState.matches({ hasDataViewIndices: 'initialized' })) {
    return (
      <HostsViewProvider
        hostsViewPageState={hostsViewPageState}
        hostsViewPageCallbacks={hostsViewPageCallbacks}
      >
        <UnifiedSearchBar />
        <EuiSpacer size="m" />
        {hostsViewPageState.context.validationError ? (
          <ErrorCallout error={hostsViewPageState.context.validationError} hasDetailsModal />
        ) : (
          <HostsContent />
        )}
      </HostsViewProvider>
    );
  } else {
    return <InvalidStateCallout state={hostsViewPageState} />;
  }
};
