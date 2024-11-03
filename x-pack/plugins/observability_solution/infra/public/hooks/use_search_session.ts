/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import { useCallback, useEffect, useState } from 'react';
import { useKibanaContextForPlugin } from './use_kibana';

export const useSearchSession = () => {
  const { services } = useKibanaContextForPlugin();
  const {
    data: { search },
  } = services;
  const [searchSessionId, setSearchSessionId] = useState<string>('');

  const updateSearchSessionId = useCallback(() => {
    const sessionId = search.session.start();
    setSearchSessionId(sessionId);
  }, [search.session]);

  useEffect(() => {
    updateSearchSessionId();
  }, [updateSearchSessionId]);

  return {
    updateSearchSessionId,
    searchSessionId,
  };
};

export const [SearchSessionProvider, useSearchSessionContext] = createContainer(useSearchSession);
