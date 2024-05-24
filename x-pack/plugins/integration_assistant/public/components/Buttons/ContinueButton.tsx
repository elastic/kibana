/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { useGlobalStore } from '@Stores/useGlobalStore';
import { useNavigate } from 'react-router-dom';

interface ContinueButtonProps {
  continuePath: string;
  isDisabled: boolean;
  currentStep: string;
  completeStep: string;
}

export const ContinueButton = ({
  continuePath,
  isDisabled,
  currentStep,
  completeStep,
}: ContinueButtonProps) => {
  const setSelected = useGlobalStore((state) => state.setSelected);
  const setIntegrationBuilderStepsState = useGlobalStore(
    (state) => state.setIntegrationBuilderStepsState
  );

  const navigate = useNavigate();
  const selectAndNavigate = (path) => {
    setSelected(path);
    navigate(path);
  };

  const onContinueClick = () => {
    selectAndNavigate(continuePath);
    setIntegrationBuilderStepsState(completeStep, 'complete');
    setIntegrationBuilderStepsState(currentStep, 'current');
  };

  return (
    <EuiButton
      isDisabled={isDisabled}
      fill={!isDisabled}
      color="success"
      aria-label="continue-button"
      onClick={onContinueClick}
    >
      Continue
    </EuiButton>
  );
};
