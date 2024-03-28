/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  type ControlEmbeddable,
  ControlGroupAPI,
  ControlGroupRenderer,
  type ControlInput,
  type ControlOutput,
  type ControlGroupInput,
} from '@kbn/controls-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { DataView } from '@kbn/data-views-plugin/public';
import { Subscription } from 'rxjs';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
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

  const getInitialInput = useCallback(async () => {
    const initialInput: Partial<ControlGroupInput> = {
      id: dataView?.id ?? '',
      viewMode: ViewMode.VIEW,
      chainingSystem: 'HIERARCHICAL',
      controlStyle: 'oneLine',
      defaultControlWidth: 'small',
      panels: controlPanels,
      filters,
      query,
      timeRange,
    };

    return { initialInput };
  }, [controlPanels, dataView?.id, filters, query, timeRange]);

  const loadCompleteHandler = useCallback(
    (controlGroup: ControlGroupAPI) => {
      if (!controlGroup) return;

      controlGroup.untilAllChildrenReady().then(() => {
        controlGroup.getChildIds().map((id) => {
          const embeddable: ControlEmbeddable<ControlInput, ControlOutput> =
            controlGroup.children[id];
          embeddable.renderPrepend = () => (
            <ControlTitle title={embeddable.getTitle()} embeddableId={id} />
          );
        });
      });

      subscriptions.current.add(
        controlGroup.onFiltersPublished$.subscribe((newFilters) => {
          onFiltersChange(newFilters);
        })
      );

      subscriptions.current.add(
        controlGroup.getInput$().subscribe(({ panels }) => setControlPanels(panels))
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

  return (
    <ControlGroupContainer>
      <ControlGroupRenderer
        getCreationOptions={getInitialInput}
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
