/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState, useEffect, useMemo } from 'react';
import { useThreatIntelSource } from './use_threat_intel_source';

export const useIsThreatIntelModuleEnabled = () => {
  const { to, from } = useMemo(
    () => ({
      to: new Date().toISOString(),
      from: new Date(0).toISOString(),
    }),
    []
  );

  const { totalCount, integrations } = useThreatIntelSource({ to, from });

  console.log('useIsThreatIntelModuleEnabled')
  return {
    isThreatIntelModuleEnabled: totalCount > 0,
    allIntegrations: integrations,
  };
};
