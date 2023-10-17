/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { useCallback } from 'react';

export const useExpandDetailsFlyout = () => {
  const { closeLeftPanel, openLeftPanel, panels } = useExpandableFlyoutContext();
  const isExpanded: boolean = panels.left != null;

  const onToggle = useCallback(() => {
    if (isExpanded) {
      closeLeftPanel();
    } else {
      openLeftPanel({
        id: 'all-risk-inputs',
      });
    }
  }, [closeLeftPanel, isExpanded, openLeftPanel]);

  return { isExpanded, onToggle };
};
