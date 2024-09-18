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

interface RuleDescriptionProps {
  description: DiffableAllFields['name'];
}

function RuleDescription({ description }: RuleDescriptionProps) {
  return <>{description}</>;
}

interface DescriptionReadOnlyProps {
  description: DiffableAllFields['description'];
}

export function DescriptionReadOnly({ description }: DescriptionReadOnlyProps) {
  return (
    <EuiDescriptionList
      listItems={[
        {
          title: ruleDetailsI18n.DESCRIPTION_FIELD_LABEL,
          description: <RuleDescription description={description} />,
        },
      ]}
    />
  );
}
