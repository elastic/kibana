/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState, useEffect } from 'react';

export const useApiKey = (key) => {
  const [apiKey, setApiKey] = useState(null);
  const [isKeyLoaded, setIsKeyLoaded] = useState(false);

  useEffect(() => {
    const storedKey = sessionStorage.getItem(key);
    if (storedKey) {
      setApiKey(storedKey);
      setIsKeyLoaded(true);
    }
  }, [key]);

  const fetchApiKey = async () => {
    const response = await fetch('/api/generate-key', {
      method: 'POST',
      body: JSON.stringify({ key }),
    });
    const data = await response.json();
    return data.apiKey;
  };

  const resetKey = () => {
    sessionStorage.removeItem(key);
    setApiKey(null);
    refetch();
  };

  const createApiKey = async (newKeyData) => {
    if (!apiKey) return;
    const response = await fetch('/api/create-key', {
      method: 'POST',
      body: JSON.stringify({ key, ...newKeyData }),
    });
    const data = await response.json();

    return data;
  };

  const getApiKeyPreview = () => {
    return apiKey ? `${apiKey.slice(0, 10)}**********` : '';
  };

  return {
    apiKey,
    resetKey,
    getApiKeyPreview,
    createApiKey,
  };
};
