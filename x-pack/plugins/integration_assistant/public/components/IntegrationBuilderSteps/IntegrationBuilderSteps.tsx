/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiStepsHorizontal, EuiStepsHorizontalProps } from '@elastic/eui';
import { useGlobalStore } from '@Stores/useGlobalStore';
import { useNavigate } from 'react-router-dom';

import { RoutePaths } from '../../constants/routePaths';

export const IntegrationBuilderSteps = () => {
  const step1 = useGlobalStore((state) => state.integrationBuilderStep1);
  const step2 = useGlobalStore((state) => state.integrationBuilderStep2);
  const step3 = useGlobalStore((state) => state.integrationBuilderStep3);
  const step4 = useGlobalStore((state) => state.integrationBuilderStep4);
  const step5 = useGlobalStore((state) => state.integrationBuilderStep5);

  const setSelected = useGlobalStore((state) => state.setSelected);

  const navigate = useNavigate();

  const selectAndNavigate = (path) => {
    setSelected(path);
    navigate(path);
  };

  const horizontalSteps = [
    {
      title: 'ECS Mapping',
      status: step1,
      onClick: () => {
        selectAndNavigate(RoutePaths.ECS_MAPPING_PATH);
      },
    },
    {
      title: 'Add Categorization',
      status: step2,
      onClick: () => {
        selectAndNavigate(RoutePaths.CATEGORIZATION_PATH);
      },
    },
    {
      title: 'Add Related Fields',
      status: step3,
      onClick: () => {
        selectAndNavigate(RoutePaths.RELATED_PATH);
      },
    },
    {
      title: 'View Results',
      status: step4,
      onClick: () => {
        selectAndNavigate(RoutePaths.INTEGRATION_BUILDER_RESULTS_PATH);
      },
    },
    {
      title: 'Build & Deploy',
      status: step5,
      onClick: () => {
        selectAndNavigate(RoutePaths.INTEGRATION_BUILDER_BUILD_PATH);
      },
    },
  ] as EuiStepsHorizontalProps['steps'];

  return <EuiStepsHorizontal steps={horizontalSteps} size="m" />;
};
