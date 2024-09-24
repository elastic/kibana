/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { IntegrationCardItem } from '@kbn/fleet-plugin/public';

import { useKibana } from '../../../../../common/lib/kibana';
import { getFilteredCards } from './utils';
import { INTEGRATION_TABS } from './const';

export const useIntegrationCardList = ({
  integrationsList,
  customCardNames,
}: {
  integrationsList: IntegrationCardItem[];
  customCardNames?: string[] | undefined;
}): IntegrationCardItem[] => {
  const kibana = useKibana();
  const basePath = kibana.services.http?.basePath.get();
  const { featuredCards, integrationCards } = useMemo(
    () => getFilteredCards(integrationsList, customCardNames, basePath),
    [integrationsList, customCardNames, basePath]
  );

  if (customCardNames && customCardNames.length > 0) {
    return Object.values(featuredCards) ?? [];
  }
  return integrationCards ?? [];
};

export const useTabMetaData = (toggleIdSelected: string) => {
  const selectedTab = useMemo(
    () => INTEGRATION_TABS.find(({ id }) => id === toggleIdSelected),
    [toggleIdSelected]
  );
  const selectedCategory = selectedTab?.category ?? '';
  const selectedSubCategory = selectedTab?.subCategory;
  const showSearchTools = selectedTab?.showSearchTools ?? true;
  const customCardNames = useMemo(() => selectedTab?.customCardNames, [selectedTab]);
  const overflow = selectedTab?.overflow ?? 'scroll';

  return useMemo(() => {
    return {
      showSearchTools,
      customCardNames,
      selectedCategory,
      selectedSubCategory,
      overflow,
    };
  }, [showSearchTools, customCardNames, selectedCategory, selectedSubCategory, overflow]);
};
