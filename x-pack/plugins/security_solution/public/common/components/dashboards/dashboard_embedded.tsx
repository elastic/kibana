/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { ViewMode } from '@kbn/embeddable-plugin/public';
import type { DashboardContainerInput } from '@kbn/dashboard-plugin/public';
import type { SavedDashboardPanel } from '@kbn/dashboard-plugin/common';
import styled from 'styled-components';
import { useKibana } from '../../lib/kibana';
import type { DashboardTableItem } from '../../containers/dashboards/use_security_dashboards_table';

const BASE_INPUT: Omit<DashboardContainerInput, 'panels'> = {
  viewMode: ViewMode.VIEW,
  isFullScreenMode: false,
  filters: [],
  useMargins: false,
  id: 'random-id',
  timeRange: {
    to: 'now',
    from: 'now-1d',
  },
  timeRestore: false,
  title: 'test',
  query: {
    query: '',
    language: 'lucene',
  },
  refreshConfig: {
    pause: true,
    value: 15,
  },
};

const createInput = (panels: SavedDashboardPanel[]): DashboardContainerInput => ({
  ...BASE_INPUT,
  panels: Object.fromEntries(
    panels.map((panel) => [
      panel.panelIndex,
      { ...panel, explicitInput: { ...panel.embeddableConfig, id: panel.panelIndex } },
    ])
  ),
});

const EmbeddedDashboardWrapper = styled.div`
  width: 100%;
`;

export const DashboardEmbedded: React.FC<{ item: DashboardTableItem }> = ({ item }) => {
  const services = useKibana().services;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const { getDashboardContainerByValueRenderer } = services.dashboard!;
  const DashboardContainerByValueRenderer = getDashboardContainerByValueRenderer();

  const input = useMemo<DashboardContainerInput | null>(() => {
    if (!item?.attributes?.panelsJSON) {
      return null;
    }
    let panels: SavedDashboardPanel[] = [];
    try {
      panels = JSON.parse(item.attributes.panelsJSON.toString());
    } catch (_) {
      return null;
    }
    return createInput(panels);
  }, [item]);

  return (
    input && (
      <EmbeddedDashboardWrapper>
        <DashboardContainerByValueRenderer input={input} />
      </EmbeddedDashboardWrapper>
    )
  );
};
