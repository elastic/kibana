/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FieldFormWrapper } from './field_form_wrapper';
import { NameEdit, nameSchema } from './fields/name';
import type { UpgradeableCommonFields } from '../../../../model/prebuilt_rule_upgrade/fields';
interface CommonRuleFieldEditProps {
  fieldName: UpgradeableCommonFields;
}

export function CommonRuleFieldEdit({ fieldName }: CommonRuleFieldEditProps) {
  switch (fieldName) {
    case 'name':
      return <FieldFormWrapper component={NameEdit} fieldFormSchema={nameSchema} />;
    default:
      return null; // Will be replaced with `assertUnreachable(fieldName)` once all fields are implemented
  }
}
