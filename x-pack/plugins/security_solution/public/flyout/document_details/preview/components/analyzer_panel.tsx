/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { useSelector } from 'react-redux';
import { FormattedMessage } from '@kbn/i18n-react';
import * as selectors from '../../../../resolver/store/selectors';
import type { State } from '../../../../common/store/types';
import { PanelRouter } from '../../../../resolver/view/panels';
import { usePreviewPanelContext } from '../context';

/**
 * Analyzer side panel on a preview panel
 */
export const AnalyzerPanel: React.FC = () => {
  const { scopeId } = usePreviewPanelContext();
  const resolverComponentInstanceID = `flyout-${scopeId}`;

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
    <PanelRouter id={resolverComponentInstanceID} />
  ) : (
    <div data-test-subj="resolver:graph:error" className="loading-container">
      <div>
        {' '}
        <FormattedMessage
          id="xpack.securitySolution.endpoint.resolver.loadingError"
          defaultMessage="Error loading data."
        />
      </div>
    </div>
  );
};

AnalyzerPanel.displayName = 'AnalyzerPanel';
