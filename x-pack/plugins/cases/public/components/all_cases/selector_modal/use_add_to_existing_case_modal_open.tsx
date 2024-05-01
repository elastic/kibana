/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCasesContext } from '../../cases_context/use_cases_context';

export const useAddToExistingCaseModalOpen = () => {
  const { isSelectCaseModalOpen } = useCasesContext();
  return isSelectCaseModalOpen;
};

export type UseAddToExistingCaseModalOpen = typeof useAddToExistingCaseModalOpen;
