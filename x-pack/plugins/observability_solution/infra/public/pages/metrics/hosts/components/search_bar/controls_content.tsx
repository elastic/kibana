/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ControlGroupAPI, ControlGroupRenderer } from '@kbn/controls-example-plugin/public';
import { ControlGroupRendererState } from '@kbn/controls-example-plugin/public/react_controls/control_group/external_api/types';
import { DataControlApi } from '@kbn/controls-example-plugin/public/react_controls/data_controls/types';
import { DataView } from '@kbn/data-views-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import React, { useCallback, useEffect, useRef } from 'react';
import { Subscription } from 'rxjs';
import { useControlPanels } from '../../hooks/use_control_panels_url_state';
import { ControlTitle } from './controls_title';

interface Props {
  dataView: DataView | undefined;
  timeRange: TimeRange;
  filters: Filter[];
  query: Query;
  onFiltersChange: (filters: Filter[]) => void;
}

export const ControlsContent: React.FC<Props> = ({
  dataView,
  filters,
  query,
  timeRange,
  onFiltersChange,
}) => {
  const [controlPanels, setControlPanels] = useControlPanels(dataView);
  const subscriptions = useRef<Subscription>(new Subscription());

  const getInitialInput = useCallback(
    (loadedDataView: DataView) => async () => {
      const initialInput: Partial<ControlGroupRendererState> = {
        id: loadedDataView.id,
        viewMode: ViewMode.VIEW,
        chainingSystem: 'HIERARCHICAL',
        controlStyle: 'oneLine',
        defaultControlWidth: 'small',
        panels: controlPanels,
      };

      return { initialInput };
    },
    [controlPanels]
  );

  const loadCompleteHandler = useCallback(
    (controlGroup: ControlGroupAPI) => {
      if (!controlGroup) return;

      controlGroup.untilInitialized().then(() => {
        const children = controlGroup.children$.getValue();
        Object.keys(children).map((childId) => {
          const child = children[childId] as DataControlApi;
          child.CustomPrependComponent = () => (
            <ControlTitle title={child.panelTitle.getValue()} embeddableId={childId} />
          );
        });
      });

      subscriptions.current.add(
        controlGroup.filters$.subscribe((newFilters = []) => {
          onFiltersChange(newFilters);
        })
      );

      subscriptions.current.add(
        controlGroup.children$.subscribe(() => {
          const { panels } = controlGroup.snapshotRuntimeState();
          if (panels) setControlPanels(panels);
        })
      );
    },
    [onFiltersChange, setControlPanels]
  );

  useEffect(() => {
    const currentSubscriptions = subscriptions.current;
    return () => {
      currentSubscriptions.unsubscribe();
    };
  }, []);

  if (!dataView) {
    return null;
  }

  return (
    <ControlGroupContainer>
      <ControlGroupRenderer
        getCreationOptions={getInitialInput(dataView)}
        ref={loadCompleteHandler}
        timeRange={timeRange}
        query={query}
        filters={filters}
      />
    </ControlGroupContainer>
  );
};

const ControlGroupContainer = euiStyled.div`
  .controlGroup {
    min-height: ${(props) => props.theme.eui.euiSizeXXL}
  }
`;
