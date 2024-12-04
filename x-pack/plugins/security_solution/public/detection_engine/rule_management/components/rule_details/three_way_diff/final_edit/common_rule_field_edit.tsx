/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RuleFieldEditFormWrapper } from './fields/rule_field_edit_form_wrapper';
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
  RequiredFieldsEdit,
  requiredFieldsSchema,
  requiredFieldsDeserializer,
  requiredFieldsSerializer,
} from './fields/required_fields';
import {
  RiskScoreEdit,
  riskScoreDeserializer,
  riskScoreSchema,
  riskScoreSerializer,
} from './fields/risk_score';
import {
  RiskScoreMappingEdit,
  riskScoreMappingDeserializer,
  riskScoreMappingSerializer,
} from './fields/risk_score_mapping';
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
import { SeverityEdit } from './fields/severity';
import {
  SeverityMappingEdit,
  severityMappingDeserializer,
  severityMappingSerializer,
} from './fields/severity_mapping';
import { TagsEdit, tagsSchema } from './fields/tags';
import { ThreatEdit, threatSchema, threatSerializer } from './fields/threat';
import {
  TimelineTemplateEdit,
  timelineTemplateDeserializer,
  timelineTemplateSchema,
  timelineTemplateSerializer,
} from './fields/timeline_template';
import {
  TimestampOverrideEdit,
  timestampOverrideDeserializer,
  timestampOverrideSerializer,
  timestampOverrideSchema,
} from './fields/timestamp_override';

interface CommonRuleFieldEditProps {
  fieldName: UpgradeableCommonFields;
}

/* eslint-disable-next-line complexity */
export function CommonRuleFieldEdit({ fieldName }: CommonRuleFieldEditProps) {
  switch (fieldName) {
    case 'building_block':
      return (
        <RuleFieldEditFormWrapper
          component={BuildingBlockEdit}
          ruleFieldFormSchema={buildingBlockSchema}
          serializer={buildingBlockSerializer}
          deserializer={buildingBlockDeserializer}
        />
      );
    case 'description':
      return (
        <RuleFieldEditFormWrapper
          component={DescriptionEdit}
          ruleFieldFormSchema={descriptionSchema}
        />
      );
    case 'false_positives':
      return (
        <RuleFieldEditFormWrapper
          component={FalsePositivesEdit}
          ruleFieldFormSchema={falsePositivesSchema}
          serializer={falsePositivesSerializer}
          deserializer={falsePositivesDeserializer}
        />
      );
    case 'investigation_fields':
      return (
        <RuleFieldEditFormWrapper
          component={InvestigationFieldsEdit}
          ruleFieldFormSchema={investigationFieldsSchema}
          serializer={investigationFieldsSerializer}
          deserializer={investigationFieldsDeserializer}
        />
      );
    case 'max_signals':
      return (
        <RuleFieldEditFormWrapper
          component={MaxSignalsEdit}
          ruleFieldFormSchema={maxSignalsSchema}
          serializer={maxSignalsSerializer}
          deserializer={maxSignalsDeserializer}
        />
      );
    case 'name':
      return <RuleFieldEditFormWrapper component={NameEdit} ruleFieldFormSchema={nameSchema} />;
    case 'note':
      return <RuleFieldEditFormWrapper component={NoteEdit} ruleFieldFormSchema={noteSchema} />;
    case 'references':
      return (
        <RuleFieldEditFormWrapper
          component={ReferencesEdit}
          ruleFieldFormSchema={referencesSchema}
          serializer={referencesSerializer}
        />
      );
    case 'related_integrations':
      return (
        <RuleFieldEditFormWrapper
          component={RelatedIntegrationsEdit}
          ruleFieldFormSchema={relatedIntegrationsSchema}
          serializer={relatedIntegrationsSerializer}
          deserializer={relatedIntegrationsDeserializer}
        />
      );
    case 'required_fields':
      return (
        <RuleFieldEditFormWrapper
          component={RequiredFieldsEdit}
          ruleFieldFormSchema={requiredFieldsSchema}
          serializer={requiredFieldsSerializer}
          deserializer={requiredFieldsDeserializer}
        />
      );
    case 'risk_score':
      return (
        <RuleFieldEditFormWrapper
          component={RiskScoreEdit}
          ruleFieldFormSchema={riskScoreSchema}
          serializer={riskScoreSerializer}
          deserializer={riskScoreDeserializer}
        />
      );
    case 'risk_score_mapping':
      return (
        <RuleFieldEditFormWrapper
          component={RiskScoreMappingEdit}
          serializer={riskScoreMappingSerializer}
          deserializer={riskScoreMappingDeserializer}
        />
      );
    case 'rule_name_override':
      return (
        <RuleFieldEditFormWrapper
          component={RuleNameOverrideEdit}
          ruleFieldFormSchema={ruleNameOverrideSchema}
          serializer={ruleNameOverrideSerializer}
          deserializer={ruleNameOverrideDeserializer}
        />
      );
    case 'rule_schedule':
      return (
        <RuleFieldEditFormWrapper
          component={RuleScheduleEdit}
          ruleFieldFormSchema={ruleScheduleSchema}
          serializer={ruleScheduleSerializer}
          deserializer={ruleScheduleDeserializer}
        />
      );
    case 'setup':
      return <RuleFieldEditFormWrapper component={SetupEdit} ruleFieldFormSchema={setupSchema} />;
    case 'severity':
      return <RuleFieldEditFormWrapper component={SeverityEdit} />;
    case 'severity_mapping':
      return (
        <RuleFieldEditFormWrapper
          component={SeverityMappingEdit}
          serializer={severityMappingSerializer}
          deserializer={severityMappingDeserializer}
        />
      );
    case 'tags':
      return <RuleFieldEditFormWrapper component={TagsEdit} ruleFieldFormSchema={tagsSchema} />;
    case 'timeline_template':
      return (
        <RuleFieldEditFormWrapper
          component={TimelineTemplateEdit}
          ruleFieldFormSchema={timelineTemplateSchema}
          serializer={timelineTemplateSerializer}
          deserializer={timelineTemplateDeserializer}
        />
      );
    case 'timestamp_override':
      return (
        <RuleFieldEditFormWrapper
          component={TimestampOverrideEdit}
          ruleFieldFormSchema={timestampOverrideSchema}
          serializer={timestampOverrideSerializer}
          deserializer={timestampOverrideDeserializer}
        />
      );
    case 'threat':
      return (
        <RuleFieldEditFormWrapper
          component={ThreatEdit}
          ruleFieldFormSchema={threatSchema}
          serializer={threatSerializer}
        />
      );
    default:
      return null; // Will be replaced with `assertUnreachable(fieldName)` once all fields are implemented
  }
}
