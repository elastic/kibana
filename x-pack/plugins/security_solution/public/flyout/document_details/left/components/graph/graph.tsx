/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo, memo } from 'react';
import { EuiPanel, EuiLoadingSpinner } from '@elastic/eui';
import { getNodes } from './utils';
import { Cytoscape } from '../cytoscape';
import { useLeftPanelContext } from '../../context';
import { useHighlightedFields } from '../../../shared/hooks/use_highlighted_fields';
import { convertHighlightedFieldsToTableRow } from '../../../shared/utils/highlighted_fields_helpers';
import { layout } from './layout';
import { useTheme } from '../cytoscape/use_theme';
import { getStyle } from './styles';
import { useFetchRelatedAlertsBySameSourceEvent } from '../../../shared/hooks/use_fetch_related_alerts_by_same_source_event';
import { getField } from '../../../shared/utils';
import { useFetchAlerts } from '../../hooks/use_fetch_alerts';

export const GRAPH_ID = 'graph';

export const Graph: FC = memo(() => {
  const theme = useTheme();

  const { getFieldsData, dataFormattedForFieldBrowser, eventId, indexName, scopeId, isPreview } =
    useLeftPanelContext();
  const highlightedFields = useHighlightedFields({
    dataFormattedForFieldBrowser,
  });

  const items = useMemo(
    () => convertHighlightedFieldsToTableRow(highlightedFields, scopeId, isPreview),
    [highlightedFields, scopeId, isPreview]
  );
  const originalEventId = getField(getFieldsData('kibana.alert.ancestors.id')) ?? '';
  const { loading: sameSourceLoading, data: alertIds } = useFetchRelatedAlertsBySameSourceEvent({
    originalEventId,
    scopeId,
  });

  const { data, loading: alertsLoading } = useFetchAlerts({
    alertIds,
    from: 0,
    size: 5,
  });

  const mappedData = useMemo(() => {
    return data
      .map((hit) => hit.fields)
      .map((fields = {}) =>
        Object.keys(fields).reduce((result, fieldName) => {
          result[fieldName] = fields?.[fieldName]?.[0] || fields?.[fieldName];
          return result;
        }, {} as Record<string, unknown>)
      );
  }, [data]);
  // console.log(mappedData);
  const elements: cytoscape.ElementDefinition[] = useMemo(
    () => getNodes(items, mappedData, getFieldsData, eventId, indexName, scopeId),
    [items, getFieldsData, mappedData, eventId, indexName, scopeId]
  );

  const style = useMemo(() => getStyle(theme), [theme]);

  return (
    <EuiPanel>
      {sameSourceLoading || alertsLoading ? (
        <EuiLoadingSpinner />
      ) : (
        <Cytoscape elements={elements} height={550} layout={layout} style={style} />
      )}
    </EuiPanel>
  );
});

Graph.displayName = 'Graph';
