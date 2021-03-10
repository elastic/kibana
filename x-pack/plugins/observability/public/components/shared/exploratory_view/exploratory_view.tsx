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
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
} from '@elastic/eui';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { ObservabilityClientPluginsStart } from '../../../plugin';
import { IndexPattern } from '../../../../../../../src/plugins/data/common';
import { ExploratoryViewHeader } from './header';
import { SeriesEditor } from './series_editor/series_editor';
import { useUrlStorage } from './hooks/use_url_strorage';
import { SeriesUrl } from './types';
import { useLensAttributes } from './hooks/use_lens_attributes';
import styled from 'styled-components';

export interface Props {
  seriesId: string;
  defaultIndexPattern?: IndexPattern | null;
}

export const ExploratoryView = ({ seriesId, defaultIndexPattern }: Props) => {
  const {
    services: { lens },
  } = useKibana<ObservabilityClientPluginsStart>();

  const LensComponent = lens.EmbeddableComponent;

  const storage = useUrlStorage();

  const series = storage.get<SeriesUrl>('elastic-co');

  const lensAttributes = useLensAttributes({
    seriesId: 'elastic-co',
  });

  return (
    <EuiPage>
      <EuiPageBody style={{ maxWidth: 1600, margin: '0 auto' }}>
        <EuiPageHeader>
          <EuiPageHeaderSection>
            <EuiTitle size="l">
              <h1>Exploratory view</h1>
            </EuiTitle>
          </EuiPageHeaderSection>
        </EuiPageHeader>
        <EuiPageContent>
          <EuiPageContentBody style={{ maxWidth: 1400, margin: '0 auto' }}>
            {defaultIndexPattern ? (
              <>
                <ExploratoryViewHeader lensAttributes={lensAttributes} />
                <LensComponent
                  id=""
                  style={{ height: 500 }}
                  timeRange={
                    series?.time || {
                      from: 'now-1h',
                      to: 'now',
                    }
                  }
                  attributes={lensAttributes}
                />
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
