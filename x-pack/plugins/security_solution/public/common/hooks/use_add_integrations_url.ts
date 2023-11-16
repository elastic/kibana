/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ADD_DATA_PATH, ADD_THREAT_INTELLIGENCE_DATA_PATH } from '../../../common/constants';
import { isThreatIntelligencePath } from '../../helpers';
import { useVariation } from '../components/utils';

import { useKibana, useNavigateTo } from '../lib/kibana';

export const useAddIntegrationsUrl = () => {
  const {
    http: {
      basePath: { prepend },
    },
    cloudExperiments,
  } = useKibana().services;
  const { pathname } = useLocation();
  const { navigateTo } = useNavigateTo();

  const isThreatIntelligence = isThreatIntelligencePath(pathname);

  const integrationsUrl = isThreatIntelligence ? ADD_THREAT_INTELLIGENCE_DATA_PATH : ADD_DATA_PATH;
  const [addIntegrationsUrl, setAddIntegrationsUrl] = useState(integrationsUrl);
  useVariation(
    cloudExperiments,
    'security-solutions.add-integrations-url',
    integrationsUrl,
    setAddIntegrationsUrl
  );

  const href = useMemo(() => prepend(addIntegrationsUrl), [prepend, addIntegrationsUrl]);

  const onClick = useCallback(
    (e) => {
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
