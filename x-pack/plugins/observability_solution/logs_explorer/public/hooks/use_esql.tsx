/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DatasetSelection,
  DataViewSelection,
  isDatasetSelection,
} from '../../common/dataset_selection';
import { useKibanaContextForPlugin } from '../utils/use_kibana';

export interface DiscoverEsqlUrlProps {
  href?: string;
  onClick: () => void;
}

export interface UseEsqlResult {
  isEsqlEnabled: boolean;
  discoverEsqlUrlProps: DiscoverEsqlUrlProps;
}

interface EsqlContextDeps {
  datasetSelection: DatasetSelection | DataViewSelection;
}

export const useEsql = ({ datasetSelection }: EsqlContextDeps): UseEsqlResult => {
  const {
    services: { uiSettings, discover },
  } = useKibanaContextForPlugin();

  const isEsqlEnabled = uiSettings?.get('discover:enableESQL');

  const discoverLinkParams = {
    query: {
      esql: `from ${
        isDatasetSelection(datasetSelection)
          ? datasetSelection.selection.dataset.name
          : datasetSelection.selection.dataView.title
      } | limit 10`,
    },
  };

  const href = discover.locator?.useUrl(discoverLinkParams);

  const onClick = () => {
    discover.locator?.navigate(discoverLinkParams);
  };

  return {
    // Data
    isEsqlEnabled,
    discoverEsqlUrlProps: {
      href,
      onClick,
    },
  };
};
