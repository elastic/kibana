/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { UpgradeableThreatMatchFields } from '../../../../model/prebuilt_rule_upgrade/fields';
import { KqlQueryEditForm } from './fields/kql_query';
import { DataSourceEditForm } from './fields/data_source';

interface ThreatMatchRuleFieldEditProps {
  fieldName: UpgradeableThreatMatchFields;
}

export function ThreatMatchRuleFieldEdit({ fieldName }: ThreatMatchRuleFieldEditProps) {
  switch (fieldName) {
    case 'kql_query':
      return <KqlQueryEditForm />;
    case 'data_source':
      return <DataSourceEditForm />;
    default:
      return null; // Will be replaced with `assertUnreachable(fieldName)` once all fields are implemented
  }
}
