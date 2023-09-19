/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { useLocation } from 'react-router-dom';

export const CREATE_RULE_SEARCH_PARAM = 'create-rule';

export function useAddRuleFlyoutState(isEditMode: boolean): boolean {
  const [isAddRuleFlyoutOpen, setIsAddRuleFlyoutOpen] = useState(false);
  const { search } = useLocation();
  const searchParams = new URLSearchParams(search);

  if (searchParams.has(CREATE_RULE_SEARCH_PARAM) && isEditMode && !isAddRuleFlyoutOpen) {
    setIsAddRuleFlyoutOpen(true);
  }

  return isAddRuleFlyoutOpen;
}
