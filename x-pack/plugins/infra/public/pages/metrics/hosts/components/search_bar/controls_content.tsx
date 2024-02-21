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
import type { Query } from '@kbn/es-query';
import { DataView } from '@kbn/data-views-plugin/public';
import { Subscription } from 'rxjs';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { ControlTitle } from './controls_title';
import { useHostsViewContext } from '../../hooks/use_hosts_view';

interface Props {
  dataView: DataView | undefined;
}

export const ControlsContent = ({ dataView }: Props) => {
  const { searchCriteria, controlPanels, actions } = useHostsViewContext();
  const subscriptions = useRef<Subscription>(new Subscription());

  const getInitialInput = useCallback(async () => {
    const initialInput: Partial<ControlGroupInput> = {
      id: dataView?.id ?? '',
      viewMode: ViewMode.VIEW,
      chainingSystem: 'HIERARCHICAL',
      controlStyle: 'oneLine',
      defaultControlWidth: 'small',
      panels: controlPanels,
      filters: searchCriteria.filters,
      query: searchCriteria.query as Query,
      timeRange: searchCriteria.timeRange,
    };

    return { initialInput };
  }, [
    controlPanels,
    dataView?.id,
    searchCriteria.filters,
    searchCriteria.query,
    searchCriteria.timeRange,
  ]);

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
          actions.updateControlPanelFilters(newFilters);
        })
      );

      subscriptions.current.add(
        controlGroup.getInput$().subscribe(({ panels }) => actions.updateControlPanels(panels))
      );
    },
    [actions]
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
        timeRange={searchCriteria.timeRange}
        query={searchCriteria.query as Query}
        filters={searchCriteria.filters}
      />
    </ControlGroupContainer>
  );
};

const ControlGroupContainer = euiStyled.div`
  .controlGroup {
    min-height: ${(props) => props.theme.eui.euiSizeXXL}
  }
`;
