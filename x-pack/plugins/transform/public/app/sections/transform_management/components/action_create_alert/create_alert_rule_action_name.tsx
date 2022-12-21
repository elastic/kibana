/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiToolTip } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { createCapabilityFailureMessage } from '../../../../lib/authorization';

interface CreateAlertRuleActionProps {
  disabled: boolean;
}

export const crateAlertRuleActionNameText = i18n.translate(
  'xpack.transform.transformList.createAlertRuleNameText',
  {
    defaultMessage: 'Create alert rule',
  }
);

export const CreateAlertRuleActionName: FC<CreateAlertRuleActionProps> = ({ disabled }) => {
  if (disabled) {
    return (
      <EuiToolTip
        position="top"
        content={createCapabilityFailureMessage('canCreateTransformAlerts')}
      >
        <>{crateAlertRuleActionNameText}</>
      </EuiToolTip>
    );
  }

  return <>{crateAlertRuleActionNameText}</>;
};
