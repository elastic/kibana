/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomizationCallback } from '@kbn/discover-plugin/public';

export const useDataViewCustomization = () => {
  const setDataViewCustomization: CustomizationCallback = ({ customizations }) => {
    customizations.set({
      id: 'data_view',
      disableDataViewPicker: true,
    });
  };

  return setDataViewCustomization;
};
