/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useEffect, useState } from 'react';
import type { FieldDataRowProps } from '../../types/field_data_row';
import { TopValues } from '../../../top_values';
import { EMSTermJoinConfig } from '../../../../../../../maps/public';
import { useFileDataVisualizerKibana } from '../../../../kibana_context';
import { DocumentStatsTable } from './document_stats';
import { ExpandedRowContent } from './expanded_row_content';
import { ChoroplethMap } from './choropleth_map';

const COMMON_EMS_LAYER_IDS = [
  'world_countries',
  'administrative_regions_lvl2',
  'usa_zip_codes',
  'usa_states',
];

export const KeywordContent: FC<FieldDataRowProps> = ({ config }) => {
  const [EMSSuggestion, setEMSSuggestion] = useState<EMSTermJoinConfig | null | undefined>();
  const { stats, fieldName } = config;
  const fieldFormat = 'fieldFormat' in config ? config.fieldFormat : undefined;
  const {
    services: { maps: mapsPlugin },
  } = useFileDataVisualizerKibana();

  const loadEMSTermSuggestions = useCallback(async () => {
    if (!mapsPlugin) return;
    const suggestion: EMSTermJoinConfig | null = await mapsPlugin.suggestEMSTermJoinConfig({
      emsLayerIds: COMMON_EMS_LAYER_IDS,
      sampleValues: Array.isArray(stats?.topValues)
        ? stats?.topValues.map((value) => value.key)
        : [],
      sampleValuesColumnName: fieldName || '',
    });
    setEMSSuggestion(suggestion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldName]);

  useEffect(
    function getInitialEMSTermSuggestion() {
      loadEMSTermSuggestions();
    },
    [loadEMSTermSuggestions]
  );

  return (
    <ExpandedRowContent dataTestSubj={'mlDVKeywordContent'}>
      <DocumentStatsTable config={config} />
      <TopValues stats={stats} fieldFormat={fieldFormat} barColor="secondary" />
      {EMSSuggestion && stats && <ChoroplethMap stats={stats} suggestion={EMSSuggestion} />}
    </ExpandedRowContent>
  );
};
