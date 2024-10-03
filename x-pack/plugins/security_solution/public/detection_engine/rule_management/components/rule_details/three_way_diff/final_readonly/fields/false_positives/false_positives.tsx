/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import * as ruleDetailsI18n from '../../../../translations';
import type { RuleFalsePositiveArray } from '../../../../../../../../../common/api/detection_engine';
import { FalsePositives } from '../../../../rule_about_section';

interface FalsePositivesReadOnlyProps {
  falsePositives: RuleFalsePositiveArray;
}

export function FalsePositivesReadOnly({ falsePositives }: FalsePositivesReadOnlyProps) {
  return (
    <EuiDescriptionList
      listItems={[
        {
          title: ruleDetailsI18n.FALSE_POSITIVES_FIELD_LABEL,
          description: <FalsePositives falsePositives={falsePositives} />,
        },
      ]}
    />
  );
}
