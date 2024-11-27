/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import * as ruleDetailsI18n from '../../../../translations';
import type { RequiredFieldArray } from '../../../../../../../../../common/api/detection_engine';
import { RequiredFields } from '../../../../rule_definition_section';

interface RequiredFieldsReadOnlyProps {
  requiredFields: RequiredFieldArray;
}

export function RequiredFieldsReadOnly({ requiredFields }: RequiredFieldsReadOnlyProps) {
  return (
    <EuiDescriptionList
      listItems={[
        {
          title: ruleDetailsI18n.REQUIRED_FIELDS_FIELD_LABEL,
          description: <RequiredFields requiredFields={requiredFields} />,
        },
      ]}
    />
  );
}
