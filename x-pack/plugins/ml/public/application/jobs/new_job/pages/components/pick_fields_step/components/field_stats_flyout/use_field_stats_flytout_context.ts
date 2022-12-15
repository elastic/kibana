/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
export const MLJobWizardFieldStatsFlyoutContext = createContext<MLJobWizardFieldStatsFlyoutProps>({
  isFlyoutVisible: false,
  setIsFlyoutVisible: () => {},
  toggleFlyoutVisible: () => {},
  setFieldName: () => {},
  setFieldValue: () => {},
});

export function useFieldStatsFlyoutContext() {
  return useContext(MLJobWizardFieldStatsFlyoutContext);
}
