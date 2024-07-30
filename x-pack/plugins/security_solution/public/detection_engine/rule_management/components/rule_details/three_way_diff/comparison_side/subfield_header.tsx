/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { camelCase, startCase } from 'lodash';
import { EuiTitle, EuiSpacer } from '@elastic/eui';
import { fieldToDisplayNameMap } from '../../diff_components/translations';
import type { DiffableAllFields } from '../../../../../../../common/api/detection_engine';

function shouldDisplaySubfieldLabelsForField(fieldName: string): boolean {
  return [
    'data_source',
    'kql_query',
    'eql_query',
    'esql_query',
    'threat_query',
    'rule_schedule',
    'rule_name_override',
    'timestamp_override',
    'timeline_template',
    'building_block',
    'threshold',
  ].includes(fieldName);
}

interface SubfieldHeaderProps {
  fieldName: keyof DiffableAllFields;
  subfieldName: string;
}

export function SubfieldHeader({ fieldName, subfieldName }: SubfieldHeaderProps) {
  if (!shouldDisplaySubfieldLabelsForField(fieldName)) {
    return null;
  }

  const subfieldLabel = fieldToDisplayNameMap[subfieldName] ?? startCase(camelCase(subfieldName));

  return (
    <>
      <EuiTitle size="xxxs">
        <h4>{subfieldLabel}</h4>
      </EuiTitle>
      <EuiSpacer size="s" />
    </>
  );
}
