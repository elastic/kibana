/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import { devToolPrebuiltContentUrl } from '../../../common/constants';
import type { RiskScoreEntity } from '../../../common/search_strategy';
import { useSpaceId } from './use_space_id';

export const useEnableRiskScoreViaDevTools = (moduleName: RiskScoreEntity) => {
  const spaceId = useSpaceId();
  const riskScoreConsoleId = `enable_${moduleName}_risk_score`;
  const loadFromUrl = useMemo(() => {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = window.location.port;
    return `/s/${spaceId}/app/dev_tools#/console?load_from=${protocol}//${hostname}:${port}${devToolPrebuiltContentUrl(
      spaceId ?? 'default',
      riskScoreConsoleId
    )}`;
  }, [riskScoreConsoleId, spaceId]);
  return loadFromUrl;
};
