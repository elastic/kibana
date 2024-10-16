/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { compact } from 'lodash';
import * as i18n from '../../../../../../rule_creation_ui/components/step_about_rule/translations';
import type { FormSchema, FormData } from '../../../../../../../shared_imports';
import { UseField } from '../../../../../../../shared_imports';
import { schema } from '../../../../../../rule_creation_ui/components/step_about_rule/schema';
import type { RuleFalsePositiveArray } from '../../../../../../../../common/api/detection_engine';
import { AddItem } from '../../../../../../rule_creation_ui/components/add_item_form';

export const falsePositivesSchema = { falsePositives: schema.falsePositives } as FormSchema<{
  falsePositives: RuleFalsePositiveArray;
}>;

const componentProps = {
  addText: i18n.ADD_FALSE_POSITIVE,
};

export function FalsePositivesEdit(): JSX.Element {
  return <UseField path="falsePositives" component={AddItem} componentProps={componentProps} />;
}

export function falsePositivesDeserializer(defaultValue: FormData) {
  /* Set initial form value with camelCase "falsePositives" key instead of "false_positives" */
  return {
    falsePositives: defaultValue,
  };
}

export function falsePositivesSerializer(formData: FormData): {
  false_positives: RuleFalsePositiveArray;
} {
  return {
    /* Remove empty items from the falsePositives array */
    false_positives: compact(formData.falsePositives),
  };
}
