/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import type { EMSTermJoinConfig } from '../../../../../../../../maps/public/ems_autosuggest/ems_autosuggest';
import { useDataVisualizerKibana } from '../../../../../kibana_context';
import { TopValues } from '../../../top_values/top_values';
import type { FieldDataRowProps } from '../../types/field_data_row';
import { ChoroplethMap } from './choropleth_map';
import { DocumentStatsTable } from './document_stats';
import { ExpandedRowContent } from './expanded_row_content';

export const KeywordContent: FC<FieldDataRowProps> = ({ config }) => {
  const [EMSSuggestion, setEMSSuggestion] = useState<EMSTermJoinConfig | null | undefined>();
  const { stats, fieldName } = config;
  const fieldFormat = 'fieldFormat' in config ? config.fieldFormat : undefined;
  const {
    services: { maps: mapsPlugin },
  } = useDataVisualizerKibana();

  const loadEMSTermSuggestions = useCallback(async () => {
    if (!mapsPlugin) return;
    const suggestion: EMSTermJoinConfig | null = await mapsPlugin.suggestEMSTermJoinConfig({
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
    <ExpandedRowContent dataTestSubj={'dataVisualizerKeywordContent'}>
      <DocumentStatsTable config={config} />
      <TopValues stats={stats} fieldFormat={fieldFormat} barColor="secondary" />
      {EMSSuggestion && stats && <ChoroplethMap stats={stats} suggestion={EMSSuggestion} />}
    </ExpandedRowContent>
  );
};
