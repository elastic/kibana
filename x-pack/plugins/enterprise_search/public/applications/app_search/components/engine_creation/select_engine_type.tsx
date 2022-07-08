/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiButton,
  EuiSpacer,
  EuiPanel,
  EuiStepsHorizontal,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import {
} from './constants';
import { EngineType } from './engine_creation_logic';

interface SelectEngineTypeProps {
  selectedEngineType: EngineType;
  setEngineType(): void;
  setStep(): void;
}

export const SelectEngineType: React.FC<SelectEngineTypeProps> = ({
  selectedEngineType,
  setStep,
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
          onClick: advanceStep,
        },
        {
          title: 'Review',
          status: 'disabled',
          onClick: () => {},
        },
    ]} />
    <EuiPanel hasBorder>
    </EuiPanel>
  </>
);
