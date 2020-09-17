/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { validate } from '../components/duration/validation';
import { Expression, Props } from '../components/duration/expression';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AlertTypeModel } from '../../../../triggers_actions_ui/public/types';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { DiskUsageAlert } from '../../../server/alerts';

export function createDiskUsageAlertType(): AlertTypeModel {
  return {
    id: DiskUsageAlert.TYPE,
    name: DiskUsageAlert.LABEL,
    iconClass: 'bell',
    alertParamsExpression: (props: Props) => (
      <Expression {...props} paramDetails={DiskUsageAlert.PARAM_DETAILS} />
    ),
    validate,
    defaultActionMessage: '{{context.internalFullMessage}}',
    requiresAppContext: true,
  };
}
