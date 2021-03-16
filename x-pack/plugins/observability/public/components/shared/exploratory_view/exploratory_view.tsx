/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiLoadingSpinner, EuiPageContentBody, EuiPanel } from '@elastic/eui';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { ObservabilityClientPluginsStart } from '../../../plugin';
import { ExploratoryViewHeader } from './header/header';
import { SeriesEditor } from './series_editor/series_editor';
import { useUrlStorage } from './hooks/use_url_strorage';
import { useLensAttributes } from './hooks/use_lens_attributes';
import { EmptyView } from './components/empty_view';
import { useIndexPatternContext } from '../../../hooks/use_default_index_pattern';

export function ExploratoryView() {
  const {
    services: { lens },
  } = useKibana<ObservabilityClientPluginsStart>();

  const { indexPattern } = useIndexPatternContext();

  const LensComponent = lens.EmbeddableComponent;

  const { firstSeriesId: seriesId, firstSeries: series } = useUrlStorage();

  const lensAttributes = useLensAttributes({
    seriesId,
    indexPattern,
  });

  return (
    <EuiPanel style={{ maxWidth: 1600, minWidth: 1200, margin: '0 auto' }}>
      <EuiPageContentBody style={{ maxWidth: 1500, margin: '0 auto' }}>
        {indexPattern ? (
          <>
            <ExploratoryViewHeader lensAttributes={lensAttributes} seriesId={seriesId} />
            {lensAttributes && seriesId ? (
              <LensComponent
                id=""
                style={{ height: 550 }}
                timeRange={series?.time}
                attributes={lensAttributes}
                onBrushEnd={(data) => {}}
                onLoad={(val) => {}}
              />
            ) : (
              <EmptyView />
            )}
            <SeriesEditor />
          </>
        ) : (
          <SpinnerWrap>
            <EuiLoadingSpinner size="xl" />
          </SpinnerWrap>
        )}
      </EuiPageContentBody>
    </EuiPanel>
  );
}

const SpinnerWrap = styled.div`
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
`;
