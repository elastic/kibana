/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomizationCallback } from '@kbn/discover-plugin/public';

export const useFlyoutCustomizations = () => {
  const setFlyoutCutomizations: CustomizationCallback = ({ customizations }) => {
    customizations.set({
      id: 'flyout',
      actions: {
        defaultActions: {
          viewSingleDocument: { disabled: true },
          viewSurroundingDocument: { disabled: true },
        },
      },
    });
  };

  return setFlyoutCutomizations;
};
