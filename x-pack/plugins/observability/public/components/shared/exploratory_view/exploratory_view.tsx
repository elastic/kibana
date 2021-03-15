/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiLoadingSpinner,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
} from '@elastic/eui';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { ObservabilityClientPluginsStart } from '../../../plugin';
import { IndexPattern } from '../../../../../../../src/plugins/data/common';
import { ExploratoryViewHeader } from './header/header';
import { SeriesEditor } from './series_editor/series_editor';
import { useUrlStorage } from './hooks/use_url_strorage';
import { useLensAttributes } from './hooks/use_lens_attributes';
import styled from 'styled-components';
import { EmptyView } from './components/empty_view';

export interface Props {
  indexPattern?: IndexPattern | null;
}

export const ExploratoryView = ({ indexPattern }: Props) => {
  const {
    services: { lens },
  } = useKibana<ObservabilityClientPluginsStart>();

  const LensComponent = lens.EmbeddableComponent;

  const { firstSeriesId: seriesId, firstSeries: series } = useUrlStorage();

  const lensAttributes = useLensAttributes({
    seriesId,
    indexPattern,
  });

  return (
    <EuiPage paddingSize="none">
      <EuiPageBody style={{ maxWidth: 1600, margin: '0 auto' }}>
        <EuiPageContent>
          <EuiPageContentBody style={{ maxWidth: 1500, margin: '0 auto' }}>
            {indexPattern ? (
              <>
                <ExploratoryViewHeader lensAttributes={lensAttributes} seriesId={seriesId} />
                {lensAttributes && seriesId ? (
                  <LensComponent
                    id=""
                    style={{ height: 500 }}
                    timeRange={series?.time}
                    attributes={lensAttributes}
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
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};

const SpinnerWrap = styled.div`
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
`;
