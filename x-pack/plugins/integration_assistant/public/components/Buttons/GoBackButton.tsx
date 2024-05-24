/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { useGlobalStore } from '@Stores/useGlobalStore';
import RoutePaths from '../../constants/routePaths';
import { useNavigate } from 'react-router-dom';

interface GoBackButtonProps {
  path: RoutePaths;
}

export const GoBackButton = ({ path }: GoBackButtonProps) => {
  const setSelected = useGlobalStore((state) => state.setSelected);
  const navigate = useNavigate();

  const onGoBackClick = () => {
    setSelected(path);
    navigate(-1);
  };

  return (
    <EuiButton color="warning" aria-label="go-back-button" onClick={onGoBackClick}>
      Go Back
    </EuiButton>
  );
};
