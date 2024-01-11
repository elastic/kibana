/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useEffect } from 'react';
import { isEqual } from 'lodash';

import { EuiSteps } from '@elastic/eui';

import { getCombinedRuntimeMappings } from '@kbn/ml-runtime-field-utils';

import { matchAllQuery } from '../../../../common';

import { useWizardActions } from '../../state_management/create_transform_store';

import {
  applyTransformConfigToDefineState,
  getDefaultStepDefineState,
  euiStepDefine,
} from '../step_define';
import { euiStepCreate } from '../step_create';
import {
  applyTransformConfigToDetailsState,
  getDefaultStepDetailsState,
  euiStepDetails,
} from '../step_details';

import { useWizardContext } from './wizard';

export const WizardSteps: FC = () => {
  const { searchItems, cloneConfig } = useWizardContext();
  const { dataView } = searchItems;

  const {
    setAdvancedSourceEditorEnabled,
    setRuntimeMappings,
    setSourceConfigUpdated,
    setStepDefineState,
    setStepDetailsState,
  } = useWizardActions();

  useEffect(() => {
    const initialStepDefineState = applyTransformConfigToDefineState(
      getDefaultStepDefineState(searchItems),
      cloneConfig,
      dataView
    );

    setRuntimeMappings(
      // apply runtime fields from both the index pattern and inline configurations
      getCombinedRuntimeMappings(dataView, cloneConfig?.source?.runtime_mappings)
    );

    const query = cloneConfig?.source?.query;
    if (query !== undefined && !isEqual(query, matchAllQuery)) {
      setAdvancedSourceEditorEnabled(true);
      setSourceConfigUpdated(true);
    }

    setStepDefineState(initialStepDefineState);
    setStepDetailsState(
      applyTransformConfigToDetailsState(getDefaultStepDetailsState(), cloneConfig)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const euiStepsConfig = [euiStepDefine, euiStepDetails, euiStepCreate];

  return <EuiSteps className="transform__steps" steps={euiStepsConfig} />;
};
