/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocalStorage } from '../../common/components/local_storage';
import { DEFAULT_ALLOW, DEFAULT_ALLOW_REPLACEMENT } from '../content/anonymization';
import { LOCAL_STORAGE_KEY } from '../helpers';

export interface UseAnonymizationStore {
  defaultAllow: string[];
  defaultAllowReplacement: string[];
  setDefaultAllow: React.Dispatch<React.SetStateAction<string[]>>;
  setDefaultAllowReplacement: React.Dispatch<React.SetStateAction<string[]>>;
}

const DEFAULT_ALLOW_KEY = `${LOCAL_STORAGE_KEY}.defaultAllow`;
const DEFAULT_ALLOW_REPLACEMENT_KEY = `${LOCAL_STORAGE_KEY}.defaultAllowReplacement`;

export const useAnonymizationStore = (): UseAnonymizationStore => {
  const [defaultAllow, setDefaultAllow] = useLocalStorage<string[]>({
    defaultValue: DEFAULT_ALLOW,
    key: DEFAULT_ALLOW_KEY,
    isInvalidDefault: (valueFromStorage) => !Array.isArray(valueFromStorage),
  });

  const [defaultAllowReplacement, setDefaultAllowReplacement] = useLocalStorage<string[]>({
    defaultValue: DEFAULT_ALLOW_REPLACEMENT,
    key: DEFAULT_ALLOW_REPLACEMENT_KEY,
    isInvalidDefault: (valueFromStorage) => !Array.isArray(valueFromStorage),
  });

  return {
    defaultAllow,
    defaultAllowReplacement,
    setDefaultAllow,
    setDefaultAllowReplacement,
  };
};
