/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import * as ruleDetailsI18n from '../../../../translations';
import type { DiffableAllFields } from '../../../../../../../../../common/api/detection_engine';

interface RuleNameProps {
  name: DiffableAllFields['name'];
}

function RuleName({ name }: RuleNameProps) {
  return <>{name}</>;
}

interface NameReadOnlyProps {
  name: DiffableAllFields['name'];
}

export function NameReadOnly({ name }: NameReadOnlyProps) {
  return (
    <EuiDescriptionList
      listItems={[
        {
          title: ruleDetailsI18n.NAME_FIELD_LABEL,
          description: <RuleName name={name} />,
        },
      ]}
    />
  );
}
