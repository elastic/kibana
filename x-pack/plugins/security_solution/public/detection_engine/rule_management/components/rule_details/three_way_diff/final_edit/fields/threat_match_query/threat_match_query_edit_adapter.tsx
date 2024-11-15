/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DataViewBase } from '@kbn/es-query';
import type { ThreatIndex } from '../../../../../../../../../common/api/detection_engine';
import { ThreatMatchQueryEdit } from '../../../../../../../rule_creation/components/threat_match_query_edit';
import type { RuleFieldEditComponentProps } from '../rule_field_edit_component_props';
import { useDataView } from '../hooks/use_data_view';

export function ThreatMatchQueryEditAdapter({
  finalDiffableRule,
}: RuleFieldEditComponentProps): JSX.Element | null {
  const { dataView, isLoading } = useDataView({
    indexPatterns: (finalDiffableRule as { threat_index: ThreatIndex }).threat_index ?? [],
  });

  return (
    <ThreatMatchQueryEdit
      path="threatQuery"
      threatIndexPatterns={dataView ?? DEFAULT_DATA_VIEW}
      loading={isLoading}
    />
  );
}

const DEFAULT_DATA_VIEW: DataViewBase = {
  fields: [],
  title: '',
};
