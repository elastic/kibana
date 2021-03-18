/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';

export interface UseControlsReturn {
  isControlOpen: boolean;
  openControl: () => void;
  closeControl: () => void;
}

export const useControl = (): UseControlsReturn => {
  const [isControlOpen, setIsControlOpen] = useState<boolean>(false);
  const openControl = useCallback(() => setIsControlOpen(true), []);
  const closeControl = useCallback(() => setIsControlOpen(false), []);

  return { isControlOpen, openControl, closeControl };
};
