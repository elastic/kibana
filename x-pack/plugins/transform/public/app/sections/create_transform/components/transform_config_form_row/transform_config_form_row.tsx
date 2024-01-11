/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiForm } from '@elastic/eui';

import { TRANSFORM_FUNCTION } from '../../../../../../common/constants';

import { useWizardSelector } from '../../state_management/create_transform_store';

import { LatestFunctionForm } from './latest_function_form';
import { PivotFunctionForm } from './pivot_function_form';

export const TransformConfigFormRow: FC = () => {
  const transformFunction = useWizardSelector((s) => s.stepDefine.transformFunction);

  return (
    <EuiForm>
      {transformFunction === TRANSFORM_FUNCTION.PIVOT ? <PivotFunctionForm /> : null}
      {transformFunction === TRANSFORM_FUNCTION.LATEST ? <LatestFunctionForm /> : null}
    </EuiForm>
  );
};
