/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';

export const useOnOpenCloseHandler = (): [boolean, () => void, () => void] => {
  const [isOpen, setIsOpen] = useState(false);

  const handleOnClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleOnOpen = useCallback(() => {
    setIsOpen(true);
  }, []);
  return [isOpen, handleOnOpen, handleOnClose];
};
