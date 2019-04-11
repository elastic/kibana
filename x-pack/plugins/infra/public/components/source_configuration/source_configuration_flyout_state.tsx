/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate-latest';
import { useCallback, useState } from 'react';

export const useSourceConfigurationFlyoutState = ({
  initialVisibility = false,
}: {
  initialVisibility?: boolean;
} = {}) => {
  const [isVisible, setIsVisible] = useState<boolean>(initialVisibility);

  const toggleIsVisible = useCallback(
    () => setIsVisible(isCurrentlyVisible => !isCurrentlyVisible),
    [setIsVisible]
  );

  const show = useCallback(() => setIsVisible(true), [setIsVisible]);
  const hide = useCallback(() => setIsVisible(false), [setIsVisible]);

  return {
    hide,
    isVisible,
    show,
    toggleIsVisible,
  };
};

export const SourceConfigurationFlyoutState = createContainer(useSourceConfigurationFlyoutState);
