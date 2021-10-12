/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

export const usePreviewRoute = () => {
  const [isPreviewRequestInProgress, setIsPreviewRequestInProgress] = useState<boolean>(false);
  const [previewId, setPreviewId] = useState<string | undefined>();
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);

  useEffect(() => {
    if (!isPreviewRequestInProgress) {
      setPreviewId(undefined);
      setErrors([]);
      setWarnings([]);
      setTimeout(() => {
        setPreviewId('b936e74c-997c-4892-a821-cae609f96660');
      }, 500);
    }
  }, [isPreviewRequestInProgress]);

  return {
    createPreview: () => setIsPreviewRequestInProgress(true),
    errors,
    isPreviewRequestInProgress,
    previewId,
    warnings,
  };
};
