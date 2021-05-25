/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState } from 'react';
import type { FieldDataRowProps } from '../../types/field_data_row';
import { TopValues } from '../../../index_based/components/field_data_row/top_values';
import { ChoroplethMap } from '../../../index_based/components/field_data_row/choropleth_map';
import { useMlKibana } from '../../../../../application/contexts/kibana';
import { EMSTermJoinConfig } from '../../../../../../../maps/public';
import { COMMON_EMS_LAYER_IDS } from '../../../../../../common/constants/embeddable_map';
import { DocumentStatsTable } from './document_stats';
import { ExpandedRowContent } from './expanded_row_content';

export const KeywordContent: FC<FieldDataRowProps> = ({ config }) => {
  const [EMSSuggestion, setEMSSuggestion] = useState<EMSTermJoinConfig | null | undefined>();
  const { stats, fieldName } = config;
  const fieldFormat = 'fieldFormat' in config ? config.fieldFormat : undefined;
  const {
    services: { maps: mapsPlugin },
  } = useMlKibana();

  const loadEMSTermSuggestions = async () => {
    if (!mapsPlugin) return;
    const suggestion: EMSTermJoinConfig | null = await mapsPlugin.suggestEMSTermJoinConfig({
      emsLayerIds: COMMON_EMS_LAYER_IDS,
      sampleValues: Array.isArray(stats?.topValues)
        ? stats?.topValues.map((value) => value.key)
        : [],
      sampleValuesColumnName: fieldName || '',
    });
    setEMSSuggestion(suggestion);
  };

  useEffect(
    function getInitialEMSTermSuggestion() {
      loadEMSTermSuggestions();
    },
    [config?.fieldName]
  );

  return (
    <ExpandedRowContent dataTestSubj={'mlDVKeywordContent'}>
      <DocumentStatsTable config={config} />
      {EMSSuggestion && stats && <ChoroplethMap stats={stats} suggestion={EMSSuggestion} />}
      {EMSSuggestion === null && (
        <TopValues stats={stats} fieldFormat={fieldFormat} barColor="secondary" />
      )}
    </ExpandedRowContent>
  );
};
