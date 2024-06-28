/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButton } from '@elastic/eui';
import { useNavigateToPath } from '../../contexts/kibana';

export const NavigateToPageButton = ({
  nextStepPath,
  title,
}: {
  nextStepPath: string;
  title: string | React.ReactNode;
}) => {
  const navigateToPath = useNavigateToPath();
  const onClick = useCallback(() => {
    navigateToPath(nextStepPath);
  }, [navigateToPath, nextStepPath]);

  return <EuiButton onClick={onClick}>{title}</EuiButton>;
};
