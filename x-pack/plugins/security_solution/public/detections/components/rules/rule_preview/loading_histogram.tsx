/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiSpacer, EuiLoadingChart } from '@elastic/eui';
import styled from 'styled-components';
import * as i18n from './translations';
import { Panel } from '../../../../common/components/panel';
import { HeaderSection } from '../../../../common/components/header_section';

const LoadingChart = styled(EuiLoadingChart)`
  display: block;
  margin: 0 auto;
`;

const DEFAULT_HISTOGRAM_HEIGHT = 300;

export const LoadingHistogram = () => {
  return (
    <Panel height={DEFAULT_HISTOGRAM_HEIGHT} data-test-subj={'preview-histogram-panel'}>
      <EuiFlexGroup gutterSize="none" direction="column">
        <EuiFlexItem grow={1}>
          <HeaderSection title={i18n.QUERY_GRAPH_HITS_TITLE} titleSize="xs" subtitle={'loading'} />
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <LoadingChart size="l" data-test-subj="preview-histogram-loading" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <>
            <EuiSpacer />
            <EuiText size="s" color="subdued">
              <p>{i18n.QUERY_PREVIEW_DISCLAIMER}</p>
            </EuiText>
          </>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Panel>
  );
};
