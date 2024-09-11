/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { EuiLoadingSpinner } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import * as selectors from '../store/selectors';
import { PanelRouter } from './panels';
import { ResolverNoProcessEvents } from './resolver_no_process_events';
import type { State } from '../../common/store/types';

interface DetailsPanelProps {
  /**
   * Id that identify the scope of analyzer
   */
  resolverComponentInstanceID: string;
}

/**
 * Details panel component
 */
const DetailsPanelComponent = React.memo(({ resolverComponentInstanceID }: DetailsPanelProps) => {
  const isLoading = useSelector((state: State) =>
    selectors.isTreeLoading(state.analyzer[resolverComponentInstanceID])
  );
  const hasError = useSelector((state: State) =>
    selectors.hadErrorLoadingTree(state.analyzer[resolverComponentInstanceID])
  );
  const resolverTreeHasNodes = useSelector((state: State) =>
    selectors.resolverTreeHasNodes(state.analyzer[resolverComponentInstanceID])
  );

  return isLoading ? (
    <div data-test-subj="resolver:graph:loading" className="loading-container">
      <EuiLoadingSpinner size="xl" />
    </div>
  ) : hasError ? (
    <div data-test-subj="resolver:graph:error" className="loading-container">
      <div>
        {' '}
        <FormattedMessage
          id="xpack.securitySolution.endpoint.resolver.loadingError"
          defaultMessage="Error loading data."
        />
      </div>
    </div>
  ) : resolverTreeHasNodes ? (
    <PanelRouter id={resolverComponentInstanceID} isSplitPanel />
  ) : (
    <ResolverNoProcessEvents />
  );
});
DetailsPanelComponent.displayName = 'DetailsPanelComponent';

/**
 * Stand alone details panel to be used when in split panel mode
 */
export const DetailsPanel = React.memo(({ resolverComponentInstanceID }: DetailsPanelProps) => {
  const isAnalyzerInitialized = useSelector((state: State) =>
    Boolean(state.analyzer[resolverComponentInstanceID])
  );

  return isAnalyzerInitialized ? (
    <DetailsPanelComponent resolverComponentInstanceID={resolverComponentInstanceID} />
  ) : null;
});

DetailsPanel.displayName = 'DetailsPanel';
