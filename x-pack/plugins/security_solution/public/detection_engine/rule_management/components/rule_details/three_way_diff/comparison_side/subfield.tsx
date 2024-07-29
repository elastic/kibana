/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { camelCase, startCase } from 'lodash';
import { EuiFlexGroup, EuiTitle, EuiHorizontalRule } from '@elastic/eui';
import { fieldToDisplayNameMap } from '../../diff_components/translations';
import { InlineDiffView } from '../inline_diff_view/inline_diff_view';
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

interface SubfieldProps {
  fieldName: keyof DiffableAllFields;
  subfieldName: string;
  oldSubfieldValue: string;
  newSubfieldValue: string;
  shouldShowSeparator: boolean;
}

export const Subfield = ({
  fieldName,
  subfieldName,
  oldSubfieldValue,
  newSubfieldValue,
  shouldShowSeparator,
}: SubfieldProps) => (
  <EuiFlexGroup justifyContent="spaceBetween">
    <EuiFlexGroup direction="column">
      {shouldDisplaySubfieldLabelsForField(fieldName) ? (
        <EuiTitle size="xxxs">
          <h4>{fieldToDisplayNameMap[subfieldName] ?? startCase(camelCase(subfieldName))}</h4>
        </EuiTitle>
      ) : null}
      <InlineDiffView oldSource={oldSubfieldValue} newSource={newSubfieldValue} />
      {shouldShowSeparator ? <EuiHorizontalRule margin="s" size="full" /> : null}
    </EuiFlexGroup>
  </EuiFlexGroup>
);
