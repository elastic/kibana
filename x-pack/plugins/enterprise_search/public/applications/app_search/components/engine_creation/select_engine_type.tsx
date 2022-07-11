/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiPanel,
  EuiStepsHorizontal,
  EuiFlexGroup,
  EuiCard,
  EuiFlexItem,
} from '@elastic/eui';

import {
  ENGINE_CREATION_SELECT_APP_SEARCH_TITLE,
  ENGINE_CREATION_SELECT_APP_SEARCH_DESCRIPTION,
  ENGINE_CREATION_SELECT_ELASTICSEARCH_TITLE,
  ENGINE_CREATION_SELECT_ELASTICSEARCH_DESCRIPTION,
  ENGINE_CREATION_NEXT_STEP_BUTTON_LABEL,
} from './constants';

import { EngineCreationLogic, EngineCreationSteps } from './engine_creation_logic';

export const SelectEngineType: React.FC = () => {
  const { engineType } = useValues(EngineCreationLogic);
  const { setEngineType, setCreationStep } = useActions(EngineCreationLogic);

  return (
    <>
      <EuiStepsHorizontal
        steps={[
          {
            title: 'Search engine type',
            status: 'current',
            onClick: () => {},
          },
          {
            title: 'Configuration',
            onClick: () => {
              setCreationStep(EngineCreationSteps.ConfigureStep);
            },
          },
          {
            title: 'Review',
            status: 'disabled',
            onClick: () => {},
          },
        ]}
      />
      <EuiPanel hasBorder>
        <EuiFlexGroup gutterSize="l">
          <EuiFlexItem>
            <EuiCard
              title={ENGINE_CREATION_SELECT_ELASTICSEARCH_TITLE}
              description={ENGINE_CREATION_SELECT_ELASTICSEARCH_DESCRIPTION}
              betaBadgeProps={{
                label: 'Beta',
                tooltipContent: 'This module is not GA. Please help us by reporting any bugs.',
              }}
              selectable={{
                onClick: () => {
                  setEngineType('elasticsearch');
                },
                isSelected: engineType === 'elasticsearch',
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCard
              title={ENGINE_CREATION_SELECT_APP_SEARCH_TITLE}
              description={ENGINE_CREATION_SELECT_APP_SEARCH_DESCRIPTION}
              selectable={{
                onClick: () => {
                  setEngineType('appSearch');
                },
                isSelected: engineType === 'appSearch',
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiButton
              fill
              onClick={() => {
                setCreationStep(EngineCreationSteps.ConfigureStep);
              }}
            >
              {ENGINE_CREATION_NEXT_STEP_BUTTON_LABEL}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </>
  );
};
