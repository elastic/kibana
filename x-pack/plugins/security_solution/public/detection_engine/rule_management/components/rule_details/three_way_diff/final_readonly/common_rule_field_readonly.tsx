/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type {
  DiffableCommonFields,
  DiffableRule,
} from '../../../../../../../common/api/detection_engine';
import { RelatedIntegrationsReadOnly } from './fields/related_integrations/related_integrations';
import { RequiredFieldsReadOnly } from './fields/required_fields/required_fields';
import { SeverityMappingReadOnly } from './fields/severity_mapping/severity_mapping';
import { RiskScoreMappingReadOnly } from './fields/risk_score_mapping/risk_score_mapping';
import { ThreatReadOnly } from './fields/threat/threat';
import { NameReadOnly } from './fields/name/name';
import { TagsReadOnly } from './fields/tags/tags';
import { DescriptionReadOnly } from './fields/description/description';
import { assertUnreachable } from '../../../../../../../common/utility_types';

interface CommonRuleFieldReadOnlyProps {
  fieldName: keyof DiffableCommonFields;
  finalDiffableRule: DiffableRule;
}

// eslint-disable-next-line complexity
export function CommonRuleFieldReadOnly({
  fieldName,
  finalDiffableRule,
}: CommonRuleFieldReadOnlyProps) {
  switch (fieldName) {
    case 'author':
      return null;
    case 'building_block':
      return null;
    case 'description':
      return <DescriptionReadOnly description={finalDiffableRule.description} />;
    case 'exceptions_list':
      return null;
    case 'investigation_fields':
      return null;
    case 'false_positives':
      return null;
    case 'license':
      return null;
    case 'max_signals':
      return null;
    case 'name':
      return <NameReadOnly name={finalDiffableRule.name} />;
    case 'note':
      return null;
    case 'related_integrations':
      return (
        <RelatedIntegrationsReadOnly relatedIntegrations={finalDiffableRule.related_integrations} />
      );
    case 'required_fields':
      return <RequiredFieldsReadOnly requiredFields={finalDiffableRule.required_fields} />;
    case 'risk_score_mapping':
      return <RiskScoreMappingReadOnly riskScoreMapping={finalDiffableRule.risk_score_mapping} />;
    case 'rule_schedule':
      return null;
    case 'severity_mapping':
      return <SeverityMappingReadOnly severityMapping={finalDiffableRule.severity_mapping} />;
    case 'tags':
      return <TagsReadOnly tags={finalDiffableRule.tags} />;
    case 'threat':
      return <ThreatReadOnly threat={finalDiffableRule.threat} />;
    case 'references':
      return null;
    case 'risk_score':
      return null;
    case 'rule_id':
      return null;
    case 'rule_name_override':
      return null;
    case 'setup':
      return null;
    case 'severity':
      return null;
    case 'timestamp_override':
      return null;
    case 'timeline_template':
      return null;
    case 'version':
      return null;
    default:
      return assertUnreachable(fieldName);
  }
}
