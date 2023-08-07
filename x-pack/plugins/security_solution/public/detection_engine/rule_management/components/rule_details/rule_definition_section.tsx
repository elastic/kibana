/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList, EuiSpacer } from '@elastic/eui';
import { getDescriptionItem } from '../../../../detections/components/rules/description_step';
import type { DefineStepRule } from '../../../../detections/pages/detection_engine/rules/types';
import type { RequiredFieldArray } from '../../../../../common/api/detection_engine/model/rule_schema/common_attributes/required_fields';
import type { RelatedIntegrationArray } from '../../../../../common/api/detection_engine/model/rule_schema/common_attributes/related_integrations';
import { schema } from '../../../../detections/components/rules/step_define_rule/schema';

export interface RuleDefinitionSectionProps {
  requiredFields: RequiredFieldArray;
  relatedIntegrations: RelatedIntegrationArray;
}

export const RuleDefinitionSection = ({
  requiredFields,
  relatedIntegrations,
}: RuleDefinitionSectionProps) => {
  const data: Partial<DefineStepRule> = {
    requiredFields,
    relatedIntegrations,
  };

  //   const schemaKeys = Object.keys(schema);

  const labels = Object.keys(schema).reduce((result, key) => {
    return { ...result, [key]: schema[key].label };
  }, {});

  const listItems = Object.keys(data).reduce(
    (result, key) => [...result, ...getDescriptionItem(key, labels[key], data)],
    []
  );

  return (
    <div>
      <EuiSpacer size="m" />
      <EuiDescriptionList type="column" listItems={listItems} />
    </div>
  );
};
