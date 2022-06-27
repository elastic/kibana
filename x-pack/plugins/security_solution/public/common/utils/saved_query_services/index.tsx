/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';
import { SavedQueryService, createSavedQueryService } from '@kbn/data-plugin/public';

import { useKibana } from '../../lib/kibana';

export const useSavedQueryServices = () => {
  const kibana = useKibana();
  const { http } = kibana.services;

  const [savedQueryService, setSavedQueryService] = useState<SavedQueryService>(
    createSavedQueryService(http)
  );

  useEffect(() => {
    setSavedQueryService(createSavedQueryService(http));
  }, [http]);
  return savedQueryService;
};
