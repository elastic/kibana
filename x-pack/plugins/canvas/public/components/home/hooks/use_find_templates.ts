/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';

import { useWorkpadService } from '../../../services';

export const useFindTemplates = () => {
  const workpadService = useWorkpadService();
  return useCallback(async () => await workpadService.findTemplates(), [workpadService]);
};
