/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { AwaitingControlGroupAPI, ControlGroupRenderer } from '@kbn/controls-plugin/public';
import { DiscoverStateContainer } from '@kbn/discover-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import type { ControlGroupInput } from '@kbn/controls-plugin/common';
import { Query } from '@kbn/es-query';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { useQuerySubscriber } from '@kbn/unified-field-list';
import {
  ControlPanels,
  CONTROL_PANELS_URL_KEY,
  useControlPanelsUrlState,
} from '../hooks/use_control_panels_url_state';

interface CustomDatasetFiltersProps {
  stateContainer: DiscoverStateContainer;
  data: DataPublicPluginStart;
}

const CustomDatasetFilters = ({ stateContainer, data }: CustomDatasetFiltersProps) => {
  const { query, filters, fromDate, toDate } = useQuerySubscriber({ data });
  const [controlGroupAPI, setControlGroupAPI] = useState<AwaitingControlGroupAPI>();
  const stateStorage = useMemo(() => stateContainer.stateStorage, [stateContainer.stateStorage]);

  const dataView = useObservable(
    stateContainer.internalState.state$,
    stateContainer.internalState.getState()
  ).dataView;

  const [controlPanels, setControlPanels] = useControlPanelsUrlState(dataView, stateStorage);

  const getInitialInput = useCallback(
    async (initialInput: Partial<ControlGroupInput>) => {
      const input: Partial<ControlGroupInput> = {
        ...initialInput,
        viewMode: ViewMode.VIEW,
        panels: controlPanels ?? initialInput.panels,
        filters: filters ?? [],
        query: query as Query,
        timeRange: { from: fromDate!, to: toDate! },
      };

      return { initialInput: input };
    },
    [controlPanels, filters, fromDate, query, toDate]
  );

  // Makes sure we are updating the panels incase new panels are created when data view changes
  useEffect(() => {
    if (!controlGroupAPI) return;

    controlGroupAPI.updateInput({ panels: controlPanels });
  }, [controlGroupAPI, controlPanels]);

  useEffect(() => {
    if (!controlGroupAPI) return;

    const filtersSubscription = controlGroupAPI.onFiltersPublished$.subscribe(
      async (newFilters) => {
        stateContainer.internalState.transitions.setCustomFilters(newFilters);
        stateContainer.actions.fetchData();
      }
    );

    // Keeps our state in sync with the url changes and makes sure it adheres to correct schema
    const urlSubscription = stateStorage
      .change$<ControlPanels>(CONTROL_PANELS_URL_KEY)
      .subscribe((panels) => setControlPanels(panels ?? undefined));

    // Keeps the url in sync with the controls state after change
    const inputSubscription = controlGroupAPI
      .getInput$()
      .subscribe(({ panels }) => setControlPanels(panels));

    return () => {
      filtersSubscription.unsubscribe();
      urlSubscription.unsubscribe();
      inputSubscription.unsubscribe();
    };
  }, [
    controlGroupAPI,
    setControlPanels,
    stateContainer.actions,
    stateContainer.internalState.transitions,
    stateStorage,
  ]);

  return (
    <ControlGroupContainer>
      <ControlGroupRenderer
        ref={setControlGroupAPI}
        getCreationOptions={getInitialInput}
        query={query as Query}
        filters={filters ?? []}
        timeRange={{ from: fromDate!, to: toDate! }}
      />
    </ControlGroupContainer>
  );
};

const ControlGroupContainer = euiStyled.div`
  .controlGroup {
    min-height: unset;
  }

  .euiFormLabel {
    padding-top: 0;
    padding-bottom: 0;
    line-height: 32px !important;
  }

  .euiFormControlLayout {
    height: 32px;
  }
`;

// eslint-disable-next-line import/no-default-export
export default CustomDatasetFilters;
