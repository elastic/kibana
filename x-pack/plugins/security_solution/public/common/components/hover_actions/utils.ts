/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';

export const getAdditionalScreenReaderOnlyContext = ({
  field,
  value,
}: {
  field: string;
  value?: string[] | string | null;
}): string => {
  if (value == null) {
    return field;
  }

  return Array.isArray(value) ? `${field} ${value.join(' ')}` : `${field} ${value}`;
};

export const useTopNPopOver = (setIsPopoverVisible?: (isVisible: boolean) => void) => {
  const [isShowingTopN, setShowTopN] = useState<boolean>(false);
  const toggleTopN = useCallback(() => {
    setShowTopN((prevShowTopN) => {
      const newShowTopN = !prevShowTopN;
      if (setIsPopoverVisible) setIsPopoverVisible(newShowTopN);
      return newShowTopN;
    });
  }, [setIsPopoverVisible]);

  const closeTopN = useCallback(() => {
    setShowTopN(false);
  }, []);

  return { closeTopN, toggleTopN, isShowingTopN };
};
