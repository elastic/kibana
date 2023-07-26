/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import type { AggregateQuery, Query, Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import type { Suggestion } from '../../../types';
import type { TypedLensByValueInput } from '../../../embeddable/embeddable_component';

export const getLensAttributes = ({
  filters,
  query,
  dataView,
  suggestion,
}: {
  filters: Filter[];
  query: Query | AggregateQuery;
  dataView?: DataView;
  suggestion: Suggestion | undefined;
}) => {
  const suggestionDatasourceState = Object.assign({}, suggestion?.datasourceState);
  const suggestionVisualizationState = Object.assign({}, suggestion?.visualizationState);
  const datasourceStates =
    suggestion && suggestion.datasourceState
      ? {
          [suggestion.datasourceId!]: {
            ...suggestionDatasourceState,
          },
        }
      : {
          formBased: {},
        };
  const visualization = suggestionVisualizationState;
  const attributes = {
    title: suggestion
      ? suggestion.title
      : i18n.translate('xpack.lens.config.suggestion.title', {
          defaultMessage: 'New suggestion',
        }),
    references: [
      {
        id: dataView?.id ?? '',
        name: `textBasedLanguages-datasource-layer-suggestion`,
        type: 'index-pattern',
      },
    ],
    state: {
      datasourceStates,
      filters,
      query,
      visualization,
      ...(dataView &&
        dataView.id &&
        !dataView.isPersisted() && {
          adHocDataViews: {
            [dataView.id]: dataView.toSpec(false),
          },
        }),
    },
    visualizationType: suggestion ? suggestion.visualizationId : 'lnsXY',
  } as TypedLensByValueInput['attributes'];
  return attributes;
};
