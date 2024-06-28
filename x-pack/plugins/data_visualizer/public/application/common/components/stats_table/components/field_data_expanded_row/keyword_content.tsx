/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useState } from 'react';
import type { EMSTermJoinConfig } from '@kbn/maps-plugin/public';
import type { FieldDataRowProps } from '../../types/field_data_row';
import { TopValues } from '../../../top_values';
import { useDataVisualizerKibana } from '../../../../../kibana_context';
import { DocumentStatsTable } from './document_stats';
import { ExpandedRowContent } from './expanded_row_content';
import { ChoroplethMap } from './choropleth_map';
import { ErrorMessageContent } from './error_message';

export const KeywordContent: FC<FieldDataRowProps> = ({ config, onAddFilter }) => {
  const [suggestion, setSuggestion] = useState<EMSTermJoinConfig | null>(null);
  const { stats, fieldName } = config;
  const fieldFormat = 'fieldFormat' in config ? config.fieldFormat : undefined;
  const {
    services: { maps: mapsPlugin },
  } = useDataVisualizerKibana();

  useEffect(() => {
    if (!mapsPlugin) return;
    if (!stats?.topValues) {
      setSuggestion(null);
      return;
    }

    let ignore = false;
    mapsPlugin
      .suggestEMSTermJoinConfig({
        sampleValues: stats.topValues.map((value) => value.key),
        sampleValuesColumnName: fieldName || '',
      })
      .then((nextSuggestion) => {
        if (!ignore) {
          setSuggestion(nextSuggestion);
        }
      })
      .catch(() => {
        if (!ignore) {
          setSuggestion(null);
        }
      });

    return () => {
      ignore = true;
    };
  }, [fieldName, mapsPlugin, stats?.topValues]);

  return (
    <ExpandedRowContent dataTestSubj={'dataVisualizerKeywordContent'}>
      <DocumentStatsTable config={config} />
      {config.stats?.error && fieldName !== undefined ? (
        <ErrorMessageContent fieldName={fieldName} error={config.stats?.error} />
      ) : null}
      <TopValues
        stats={stats}
        fieldFormat={fieldFormat}
        barColor="success"
        onAddFilter={onAddFilter}
      />
      {config.stats?.sampledValues && fieldName !== undefined ? (
        <TopValues
          stats={stats}
          fieldFormat={fieldFormat}
          barColor="success"
          onAddFilter={onAddFilter}
          showSampledValues={true}
        />
      ) : null}

      {suggestion && stats && <ChoroplethMap stats={stats} suggestion={suggestion} />}
    </ExpandedRowContent>
  );
};
