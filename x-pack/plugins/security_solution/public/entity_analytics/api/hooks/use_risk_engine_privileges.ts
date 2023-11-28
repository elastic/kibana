/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';
import { fetchRiskEnginePrivileges } from '../api';

export const useRiskEnginePrivileges = () => {
  return useQuery(['GET', 'FETCH_RISK_ENGINE_PRIVILEGES'], fetchRiskEnginePrivileges);
};
