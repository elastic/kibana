/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FieldFormWrapper } from './field_form_wrapper';
import type { UpgradeableCommonFields } from '../../../../model/prebuilt_rule_upgrade/fields';
import { DescriptionEdit, descriptionSchema } from './fields/description';
import {
  FalsePositivesEdit,
  falsePositivesSchema,
  falsePositivesSerializer,
  falsePositivesDeserializer,
} from './fields/false_positives';
import {
  InvestigationFieldsEdit,
  investigationFieldsSchema,
  investigationFieldsDeserializer,
  investigationFieldsSerializer,
} from './fields/investigation_fields';
import { NameEdit, nameSchema } from './fields/name';
import { ReferencesEdit, referencesSchema, referencesSerializer } from './fields/references';
import { TagsEdit, tagsSchema } from './fields/tags';

interface CommonRuleFieldEditProps {
  fieldName: UpgradeableCommonFields;
}

export function CommonRuleFieldEdit({ fieldName }: CommonRuleFieldEditProps) {
  switch (fieldName) {
    case 'description':
      return <FieldFormWrapper component={DescriptionEdit} fieldFormSchema={descriptionSchema} />;
    case 'false_positives':
      return (
        <FieldFormWrapper
          component={FalsePositivesEdit}
          fieldFormSchema={falsePositivesSchema}
          serializer={falsePositivesSerializer}
          deserializer={falsePositivesDeserializer}
        />
      );
    case 'investigation_fields':
      return (
        <FieldFormWrapper
          component={InvestigationFieldsEdit}
          fieldFormSchema={investigationFieldsSchema}
          serializer={investigationFieldsSerializer}
          deserializer={investigationFieldsDeserializer}
        />
      );
    case 'name':
      return <FieldFormWrapper component={NameEdit} fieldFormSchema={nameSchema} />;
    case 'references':
      return (
        <FieldFormWrapper
          component={ReferencesEdit}
          fieldFormSchema={referencesSchema}
          serializer={referencesSerializer}
        />
      );
    case 'tags':
      return <FieldFormWrapper component={TagsEdit} fieldFormSchema={tagsSchema} />;
    default:
      return null; // Will be replaced with `assertUnreachable(fieldName)` once all fields are implemented
  }
}
