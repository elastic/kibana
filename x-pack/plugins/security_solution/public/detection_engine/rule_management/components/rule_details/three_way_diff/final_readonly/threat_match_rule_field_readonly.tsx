/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DiffableThreatMatchFields } from '../../../../../../../common/api/detection_engine';
import { DataSourceReadOnly } from './fields/data_source/data_source';
import { KqlQueryReadOnly } from './fields/kql_query';
import { ThreatIndexReadOnly } from './fields/threat_index/threat_index';
import { ThreatIndicatorPathReadOnly } from './fields/threat_indicator_path/threat_indicator_path';
import { ThreatMappingReadOnly } from './fields/threat_mapping/threat_mapping';
import { ThreatQueryReadOnly } from './fields/threat_query/threat_query';
import { TypeReadOnly } from './fields/type/type';

interface ThreatMatchRuleFieldReadOnlyProps {
  fieldName: keyof DiffableThreatMatchFields;
  finalDiffableRule: DiffableThreatMatchFields;
}

export function ThreatMatchRuleFieldReadOnly({
  fieldName,
  finalDiffableRule,
}: ThreatMatchRuleFieldReadOnlyProps) {
  switch (fieldName) {
    case 'data_source':
      return <DataSourceReadOnly dataSource={finalDiffableRule.data_source} />;
    case 'kql_query':
      return (
        <KqlQueryReadOnly
          kqlQuery={finalDiffableRule.kql_query}
          dataSource={finalDiffableRule.data_source}
          ruleType={finalDiffableRule.type}
        />
      );
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
    case 'type':
      return <TypeReadOnly type={finalDiffableRule.type} />;
    default:
      return null; // Will replace with `assertUnreachable(fieldName)` once all fields are implemented
  }
}
