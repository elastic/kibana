/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DiffableCommonFields } from '../../../../../../../common/api/detection_engine';
import { FieldFormWrapper } from './field_form_wrapper';
import { NameEdit, nameSchema } from './fields/name';

interface CommonRuleFieldEditProps {
  fieldName: keyof DiffableCommonFields;
}

export function CommonRuleFieldEdit({ fieldName }: CommonRuleFieldEditProps) {
  switch (fieldName) {
    case 'name':
      return <FieldFormWrapper component={NameEdit} fieldFormSchema={nameSchema} />;
    case 'version':
      /* "version" is not editable */
      return null;
    default:
      return null; // Will be replaced with `assertUnreachable(fieldName)` once all fields are implemented
  }
}
