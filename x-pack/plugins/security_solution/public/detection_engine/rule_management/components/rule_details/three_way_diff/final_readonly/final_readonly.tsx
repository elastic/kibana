/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { assertUnreachable } from '../../../../../../../common/utility_types';
import type { DiffableAllFields } from '../../../../../../../common/api/detection_engine';
import { KqlQueryReadOnly } from './field_components/kql_query';
import { DataSourceReadOnly } from './field_components/data_source/data_source';
import { EqlQueryReadOnly } from './field_components/eql_query/eql_query';
import { EsqlQueryReadOnly } from './field_components/esql_query/esql_query';
import { MachineLearningJobIdReadOnly } from './field_components/machine_learning_job_id/machine_learning_job_id';
import { RelatedIntegrationsReadOnly } from './field_components/related_integrations/related_integrations';
import { RequiredFieldsReadOnly } from './field_components/required_fields/required_fields';
import { SeverityMappingReadOnly } from './field_components/severity_mapping/severity_mapping';
import { RiskScoreMappingReadOnly } from './field_components/risk_score_mapping/risk_score_mapping';
import { ThreatMappingReadOnly } from './field_components/threat_mapping/threat_mapping';
import { ThreatReadOnly } from './field_components/threat/threat';
import { ThreatIndexReadOnly } from './field_components/threat_index/threat_index';
import { ThreatIndicatorPathReadOnly } from './field_components/threat_indicator_path/threat_indicator_path';
import { ThreatQueryReadOnly } from './field_components/threat_query/threat_query';

interface FinalReadonlyProps {
  fieldName: keyof DiffableAllFields;
  finalDiffableRule: DiffableAllFields;
}

export function FinalReadonly({ fieldName, finalDiffableRule }: FinalReadonlyProps) {
  switch (fieldName) {
    case 'data_source':
      return <DataSourceReadOnly dataSource={finalDiffableRule.data_source} />;
    case 'eql_query':
      return (
        <EqlQueryReadOnly
          eqlQuery={finalDiffableRule.eql_query}
          dataSource={finalDiffableRule.data_source}
        />
      );
    case 'esql_query':
      return <EsqlQueryReadOnly esqlQuery={finalDiffableRule.esql_query} />;
    case 'kql_query':
      return (
        <KqlQueryReadOnly
          kqlQuery={finalDiffableRule.kql_query}
          dataSource={finalDiffableRule.data_source}
          ruleType={finalDiffableRule.type}
        />
      );
    case 'machine_learning_job_id':
      return (
        <MachineLearningJobIdReadOnly
          machineLearningJobId={finalDiffableRule.machine_learning_job_id}
        />
      );
    case 'related_integrations':
      return (
        <RelatedIntegrationsReadOnly relatedIntegrations={finalDiffableRule.related_integrations} />
      );
    case 'required_fields':
      return <RequiredFieldsReadOnly requiredFields={finalDiffableRule.required_fields} />;
    case 'risk_score_mapping':
      return <RiskScoreMappingReadOnly riskScoreMapping={finalDiffableRule.risk_score_mapping} />;
    case 'severity_mapping':
      return <SeverityMappingReadOnly severityMapping={finalDiffableRule.severity_mapping} />;
    case 'threat':
      return <ThreatReadOnly threat={finalDiffableRule.threat} />;
    case 'threat_index':
      return <ThreatIndexReadOnly threatIndex={finalDiffableRule.threat_index} />;
    case 'threat_indicator_path':
      return (
        <ThreatIndicatorPathReadOnly
          threatIndicatorPath={finalDiffableRule.threat_indicator_path}
        />
      );
    case 'threat_mapping':
      return <ThreatMappingReadOnly threatMapping={finalDiffableRule.threat_mapping} />;
    case 'threat_query':
      return (
        <ThreatQueryReadOnly
          threatQuery={finalDiffableRule.threat_query}
          dataSource={finalDiffableRule.data_source}
        />
      );
    default:
      return assertUnreachable(fieldName);
  }
}
