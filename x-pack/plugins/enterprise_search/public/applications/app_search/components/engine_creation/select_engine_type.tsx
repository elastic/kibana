/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

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
  ENGINE_CREATION_NEXT_STEP_BUTTON_LABEL
} from './constants';

import { EngineType } from './engine_creation_logic';

interface SelectEngineTypeProps {
  selectedEngineType: EngineType;
  setAppSearchEngineType(): void;
  setElasticsearchEngineType(): void;
  setConfigurationStep(): void;
}

export const SelectEngineType: React.FC<SelectEngineTypeProps> = ({
  selectedEngineType,
  setAppSearchEngineType,
  setElasticsearchEngineType,
  setConfigurationStep,
}) => (
  <>
    <EuiStepsHorizontal steps={[
        {
          title: 'Search engine type',
          status: 'current',
          onClick: () => {},
        },
        {
          title: 'Configuration',
          onClick: setConfigurationStep,
        },
        {
          title: 'Review',
          status: 'disabled',
          onClick: () => {},
        },
    ]} />
    <EuiPanel hasBorder>
      <EuiFlexGroup gutterSize="l">
        <EuiFlexItem>
          <EuiCard
            title={ENGINE_CREATION_SELECT_ELASTICSEARCH_TITLE}
            description={ENGINE_CREATION_SELECT_ELASTICSEARCH_DESCRIPTION}
            betaBadgeProps={{
              label: 'Beta',
              tooltipContent:
                'This module is not GA. Please help us by reporting any bugs.',
            }}
            selectable={{
              onClick: setElasticsearchEngineType,
              isSelected: selectedEngineType === 'elasticsearch',
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCard
            title={ENGINE_CREATION_SELECT_APP_SEARCH_TITLE}
            description={ENGINE_CREATION_SELECT_APP_SEARCH_DESCRIPTION}
            selectable={{
              onClick: setAppSearchEngineType,
              isSelected: selectedEngineType === 'appSearch',
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiButton
          fill
          onClick={setConfigurationStep}
          >{ENGINE_CREATION_NEXT_STEP_BUTTON_LABEL}</EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  </>
);
