/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '../../../../common/lib/kibana';
import { FLYOUT_STORAGE_KEYS } from '../../shared/constants/local_storage';

export interface UseExpandSectionParams {
  /**
   * Title of the section
   */
  title: string;
  /**
   * Default value for the section
   */
  defaultValue: boolean;
}

/**
 * Hook to get the expanded state of a section from local storage.
 */
export const useExpandSection = ({ title, defaultValue }: UseExpandSectionParams): boolean => {
  const { storage } = useKibana().services;

  const localStorage = storage.get(FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS);
  const key = title.toLowerCase();
  const expanded =
    localStorage && localStorage[key] !== undefined ? localStorage[key] : defaultValue;

  return expanded;
};
