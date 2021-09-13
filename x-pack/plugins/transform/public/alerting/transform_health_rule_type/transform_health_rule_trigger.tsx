/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiForm } from '@elastic/eui';
import React, { FC } from 'react';
import type { AlertTypeParamsExpressionProps } from '../../../../triggers_actions_ui/public';
import type { TransformHealthRuleParams } from '../../../common/types/alerting';

export type TransformHealthRuleTriggerProps = AlertTypeParamsExpressionProps<TransformHealthRuleParams>;

const TransformHealthRuleTrigger: FC<TransformHealthRuleTriggerProps> = ({
  alertParams,
  setAlertParams,
  errors,
}) => {
  const formErrors = Object.values(errors).flat();
  const isFormInvalid = formErrors.length > 0;

  return (
    <EuiForm
      data-test-subj={'transformHealthAlertingRuleForm'}
      invalidCallout={'none'}
      error={formErrors}
      isInvalid={isFormInvalid}
    >
      <div />
    </EuiForm>
  );
};

// Default export is required for React.lazy loading

// eslint-disable-next-line import/no-default-export
export default TransformHealthRuleTrigger;
