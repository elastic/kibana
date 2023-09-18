/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomizationCallback } from '@kbn/discover-plugin/public/customizations/types';
import { useHistogramCustomization } from './use_histogram_customizations';
import { useSearchBarCustomizations } from './use_search_bar_customizations';
import { useFlyoutCustomizations } from './use_flyout_customizations';

export const useSetDiscoverCustomizationCallbacks = (): CustomizationCallback[] => {
  const searchBarCustomizationCallback = useSearchBarCustomizations();

  const histogramCustomizationCallback = useHistogramCustomization();
  const flyoutCustomizationCallback = useFlyoutCustomizations();

  return [
    searchBarCustomizationCallback,
    histogramCustomizationCallback,
    flyoutCustomizationCallback,
  ];
};
