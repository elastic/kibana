/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { UpgradeableEsqlFields } from '../../../../model/prebuilt_rule_upgrade/fields';
import { AlertSuppressionEditForm } from './fields/alert_suppression';

interface EqQlRuleFieldEditProps {
  fieldName: UpgradeableEsqlFields;
}

export function EsqlRuleFieldEdit({ fieldName }: EqQlRuleFieldEditProps) {
  switch (fieldName) {
    case 'alert_suppression':
      return <AlertSuppressionEditForm />;
    default:
      return null; // Will be replaced with `assertUnreachable(fieldName)` once all fields are implemented
  }
}
