/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DISCOVER_APP_LOCATOR } from '@kbn/discover-locators';
import { DatasetSelection } from '../../common/dataset_selection';
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
  datasetSelection: DatasetSelection;
}

export const useEsql = ({ datasetSelection }: EsqlContextDeps): UseEsqlResult => {
  const {
    services: { uiSettings, share },
  } = useKibanaContextForPlugin();

  const isEsqlEnabled = uiSettings?.get('discover:enableESQL');

  const discoverLinkParams = {
    query: {
      esql: `from ${datasetSelection.selection.dataset.name} | limit 10`,
    },
  };

  const locator = share?.url.locators.get(DISCOVER_APP_LOCATOR);
  const href = locator?.useUrl(discoverLinkParams);

  const onClick = () => {
    locator?.navigate(discoverLinkParams);
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
