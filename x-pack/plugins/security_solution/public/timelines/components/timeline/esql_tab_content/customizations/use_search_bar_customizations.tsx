/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomizationCallback } from '@kbn/discover-plugin/public';
import { useGetStatefulQueryBar } from '../use_get_stateful_query_bar';

export const useSearchBarCustomizations = () => {
  const { CustomStatefulTopNavKqlQueryBar } = useGetStatefulQueryBar();

  const setSearchBarCustomizations: CustomizationCallback = ({ customizations }) => {
    customizations.set({
      id: 'search_bar',
      CustomSearchBar: CustomStatefulTopNavKqlQueryBar,
      hideDataViewPicker: true,
    });
  };

  return setSearchBarCustomizations;
};
