/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { ADD_DATA_PATH, ADD_THREAT_INTELLIGENCE_DATA_PATH } from '../../../common/constants';
import { isThreatIntelligencePath } from '../../helpers';

import { useKibana, useNavigateTo } from '../lib/kibana';

export const useAddIntegrationsUrl = () => {
  const {
    http: {
      basePath: { prepend },
    },
  } = useKibana().services;
  const { pathname } = useLocation();
  const { navigateTo } = useNavigateTo();

  const isThreatIntelligence = isThreatIntelligencePath(pathname);

  const integrationsUrl = isThreatIntelligence ? ADD_THREAT_INTELLIGENCE_DATA_PATH : ADD_DATA_PATH;

  const href = useMemo(() => prepend(integrationsUrl), [prepend, integrationsUrl]);

  const onClick = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      navigateTo({ url: href });
    },
    [href, navigateTo]
  );

  return {
    href,
    onClick,
  };
};
