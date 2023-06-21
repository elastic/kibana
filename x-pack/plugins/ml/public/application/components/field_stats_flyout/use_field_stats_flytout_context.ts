/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
interface MLJobWizardFieldStatsFlyoutProps {
  isFlyoutVisible: boolean;
  setIsFlyoutVisible: (v: boolean) => void;
  toggleFlyoutVisible: () => void;
  setFieldName: (v: string | undefined) => void;
  fieldName?: string;
  setFieldValue: (v: string) => void;
  fieldValue?: string | number;
}
export const MLFieldStatsFlyoutContext = createContext<MLJobWizardFieldStatsFlyoutProps>({
  isFlyoutVisible: false,
  setIsFlyoutVisible: () => {},
  toggleFlyoutVisible: () => {},
  setFieldName: () => {},
  setFieldValue: () => {},
});

export function useFieldStatsFlyoutContext() {
  return useContext(MLFieldStatsFlyoutContext);
}
