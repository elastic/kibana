/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '../../../../../../common/lib/kibana';
import { ConsoleDataState } from '../types';

interface InputHistoryOfflineStorage {
  version: number;
  data: ConsoleDataState['input']['history'];
}

/**
 * The current version of the input history offline storage. Will help in the future
 * if we ever need to "migrate" stored data to a new format
 */
const CURRENT_VERSION = 1;

const getDefaultInputHistoryStorage = (): InputHistoryOfflineStorage => {
  return {
    version: CURRENT_VERSION,
    data: [],
  };
};

export const useInputHistoryStorage = (storageKeyPrefix: string) => {
  const { storage } = useKibana().services;
};
