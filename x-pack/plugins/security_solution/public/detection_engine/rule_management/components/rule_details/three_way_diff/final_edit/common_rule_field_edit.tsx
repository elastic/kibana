/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FieldFormWrapper } from './field_form_wrapper';
import type { UpgradeableCommonFields } from '../../../../model/prebuilt_rule_upgrade/fields';
import {
  BuildingBlockEdit,
  buildingBlockSchema,
  buildingBlockDeserializer,
  buildingBlockSerializer,
} from './fields/building_block';
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
import {
  MaxSignalsEdit,
  maxSignalsDeserializer,
  maxSignalsSchema,
  maxSignalsSerializer,
} from './fields/max_signals';
import { NameEdit, nameSchema } from './fields/name';
import { NoteEdit, noteSchema } from './fields/note';
import { ReferencesEdit, referencesSchema, referencesSerializer } from './fields/references';
import {
  RelatedIntegrationsEdit,
  relatedIntegrationsSchema,
  relatedIntegrationsDeserializer,
  relatedIntegrationsSerializer,
} from './fields/related_integrations';
import {
  RuleNameOverrideEdit,
  ruleNameOverrideDeserializer,
  ruleNameOverrideSerializer,
  ruleNameOverrideSchema,
} from './fields/rule_name_override';
import {
  RuleScheduleEdit,
  ruleScheduleSchema,
  ruleScheduleDeserializer,
  ruleScheduleSerializer,
} from './fields/rule_schedule';
import { SetupEdit, setupSchema } from './fields/setup';
import { TagsEdit, tagsSchema } from './fields/tags';
import { ThreatEdit, threatSchema, threatSerializer } from './fields/threat';
import {
  TimelineTemplateEdit,
  timelineTemplateDeserializer,
  timelineTemplateSchema,
  timelineTemplateSerializer,
} from './fields/timeline_template';

interface CommonRuleFieldEditProps {
  fieldName: UpgradeableCommonFields;
}

export function CommonRuleFieldEdit({ fieldName }: CommonRuleFieldEditProps) {
  switch (fieldName) {
    case 'building_block':
      return (
        <FieldFormWrapper
          component={BuildingBlockEdit}
          fieldFormSchema={buildingBlockSchema}
          serializer={buildingBlockSerializer}
          deserializer={buildingBlockDeserializer}
        />
      );
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
    case 'max_signals':
      return (
        <FieldFormWrapper
          component={MaxSignalsEdit}
          fieldFormSchema={maxSignalsSchema}
          serializer={maxSignalsSerializer}
          deserializer={maxSignalsDeserializer}
        />
      );
    case 'name':
      return <FieldFormWrapper component={NameEdit} fieldFormSchema={nameSchema} />;
    case 'note':
      return <FieldFormWrapper component={NoteEdit} fieldFormSchema={noteSchema} />;
    case 'references':
      return (
        <FieldFormWrapper
          component={ReferencesEdit}
          fieldFormSchema={referencesSchema}
          serializer={referencesSerializer}
        />
      );
    case 'related_integrations':
      return (
        <FieldFormWrapper
          component={RelatedIntegrationsEdit}
          fieldFormSchema={relatedIntegrationsSchema}
          serializer={relatedIntegrationsSerializer}
          deserializer={relatedIntegrationsDeserializer}
        />
      );
    case 'rule_name_override':
      return (
        <FieldFormWrapper
          component={RuleNameOverrideEdit}
          fieldFormSchema={ruleNameOverrideSchema}
          serializer={ruleNameOverrideSerializer}
          deserializer={ruleNameOverrideDeserializer}
        />
      );
    case 'rule_schedule':
      return (
        <FieldFormWrapper
          component={RuleScheduleEdit}
          fieldFormSchema={ruleScheduleSchema}
          serializer={ruleScheduleSerializer}
          deserializer={ruleScheduleDeserializer}
        />
      );
    case 'setup':
      return <FieldFormWrapper component={SetupEdit} fieldFormSchema={setupSchema} />;
    case 'tags':
      return <FieldFormWrapper component={TagsEdit} fieldFormSchema={tagsSchema} />;
    case 'timeline_template':
      return (
        <FieldFormWrapper
          component={TimelineTemplateEdit}
          fieldFormSchema={timelineTemplateSchema}
          serializer={timelineTemplateSerializer}
          deserializer={timelineTemplateDeserializer}
        />
      );
    case 'threat':
      return (
        <FieldFormWrapper
          component={ThreatEdit}
          fieldFormSchema={threatSchema}
          serializer={threatSerializer}
        />
      );
    default:
      return null; // Will be replaced with `assertUnreachable(fieldName)` once all fields are implemented
  }
}
