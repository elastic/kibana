/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DocLinksStart } from 'kibana/public';
import { EuiLink, EuiTextColor, EuiButton, EuiSpacer } from '@elastic/eui';

import { DatatableColumn } from 'src/plugins/expressions';
import type { FramePublicAPI, StateSetter } from '../types';
import type { IndexPattern, IndexPatternLayer, IndexPatternPrivateState } from './types';
import type { ReferenceBasedIndexPatternColumn } from './operations/definitions/column_types';

import {
  operationDefinitionMap,
  GenericIndexPatternColumn,
  TermsIndexPatternColumn,
  CountIndexPatternColumn,
  updateColumnParam,
  updateDefaultLabels,
} from './operations';

import { getInvalidFieldMessage, isColumnOfType } from './operations/definitions/helpers';
import { isQueryValid } from './operations/definitions/filters';
import { checkColumnForPrecisionError } from '../../../../../src/plugins/data/common';
import { hasField } from './pure_utils';
import { mergeLayer } from './state_helpers';
import { DEFAULT_MAX_DOC_COUNT } from './operations/definitions/terms';

export function isColumnInvalid(
  layer: IndexPatternLayer,
  columnId: string,
  indexPattern: IndexPattern
) {
  const column: GenericIndexPatternColumn | undefined = layer.columns[columnId];
  if (!column || !indexPattern) return;

  const operationDefinition = column.operationType && operationDefinitionMap[column.operationType];
  // check also references for errors
  const referencesHaveErrors =
    true &&
    'references' in column &&
    Boolean(getReferencesErrors(layer, column, indexPattern).filter(Boolean).length);

  const operationErrorMessages =
    operationDefinition &&
    operationDefinition.getErrorMessage?.(layer, columnId, indexPattern, operationDefinitionMap);

  const filterHasError = column.filter ? !isQueryValid(column.filter, indexPattern) : false;

  return (
    (operationErrorMessages && operationErrorMessages.length > 0) ||
    referencesHaveErrors ||
    filterHasError
  );
}

function getReferencesErrors(
  layer: IndexPatternLayer,
  column: ReferenceBasedIndexPatternColumn,
  indexPattern: IndexPattern
) {
  return column.references?.map((referenceId: string) => {
    const referencedOperation = layer.columns[referenceId]?.operationType;
    const referencedDefinition = operationDefinitionMap[referencedOperation];
    return referencedDefinition?.getErrorMessage?.(
      layer,
      referenceId,
      indexPattern,
      operationDefinitionMap
    );
  });
}

export function fieldIsInvalid(
  column: GenericIndexPatternColumn | undefined,
  indexPattern: IndexPattern
) {
  if (!column || !hasField(column)) {
    return false;
  }
  return !!getInvalidFieldMessage(column, indexPattern)?.length;
}

export function getPrecisionErrorWarningMessages(
  state: IndexPatternPrivateState,
  { activeData }: FramePublicAPI,
  docLinks: DocLinksStart,
  setState: StateSetter<IndexPatternPrivateState>
) {
  const warningMessages: React.ReactNode[] = [];

  if (state && activeData) {
    Object.entries(activeData)
      .reduce(
        (acc, [layerId, { columns }]) => [
          ...acc,
          ...columns.map((column) => ({ layerId, column })),
        ],
        [] as Array<{ layerId: string; column: DatatableColumn }>
      )
      .forEach(({ layerId, column }) => {
        const currentLayer = state.layers[layerId];
        const currentColumn = currentLayer?.columns[column.id];
        if (currentLayer && currentColumn && checkColumnForPrecisionError(column)) {
          const indexPattern = state.indexPatterns[currentLayer.indexPatternId];
          const isAscendingCountSorting =
            isColumnOfType<TermsIndexPatternColumn>('terms', currentColumn) &&
            currentColumn.params.orderBy.type === 'column' &&
            currentColumn.params.orderDirection === 'asc' &&
            isColumnOfType<CountIndexPatternColumn>(
              'count',
              currentLayer.columns[currentColumn.params.orderBy.columnId]
            );
          if (!isAscendingCountSorting) {
            warningMessages.push(
              <FormattedMessage
                id="xpack.lens.indexPattern.precisionErrorWarning"
                defaultMessage="{name} for this visualization may be approximate due to how the data is indexed. Try increasing the number of {topValues} or use {filters} instead of {topValues} for precise results. To learn more about this limit, {link}."
                values={{
                  name: <EuiTextColor color="accent">{column.name}</EuiTextColor>,
                  topValues: (
                    <EuiTextColor color="subdued">
                      <FormattedMessage
                        id="xpack.lens.indexPattern.precisionErrorWarning.topValues"
                        defaultMessage="Top values"
                      />
                    </EuiTextColor>
                  ),
                  filters: (
                    <EuiTextColor color="subdued">
                      <FormattedMessage
                        id="xpack.lens.indexPattern.precisionErrorWarning.filters"
                        defaultMessage="Filters"
                      />
                    </EuiTextColor>
                  ),
                  link: (
                    <EuiLink
                      href={docLinks.links.aggs.terms_doc_count_error}
                      color="text"
                      target="_blank"
                      external={true}
                    >
                      <FormattedMessage
                        defaultMessage="visit the documentation"
                        id="xpack.lens.indexPattern.precisionErrorWarning.link"
                      />
                    </EuiLink>
                  ),
                }}
              />
            );
          } else {
            warningMessages.push(
              <>
                <FormattedMessage
                  id="xpack.lens.indexPattern.ascendingCountPrecisionErrorWarning"
                  defaultMessage="{name} for this visualization may be approximate due to how the data is indexed. Try sorting by rarity instead of ascending count of records. To learn more about this limit, {link}."
                  values={{
                    name: <EuiTextColor color="accent">{column.name}</EuiTextColor>,
                    link: (
                      <EuiLink
                        href={docLinks.links.aggs.rare_terms}
                        color="text"
                        target="_blank"
                        external={true}
                      >
                        <FormattedMessage
                          defaultMessage="visit the documentation"
                          id="xpack.lens.indexPattern.ascendingCountPrecisionErrorWarning.link"
                        />
                      </EuiLink>
                    ),
                  }}
                />
                <EuiSpacer size="s" />
                <EuiButton
                  onClick={() => {
                    setState((prevState) =>
                      mergeLayer({
                        state: prevState,
                        layerId,
                        newLayer: updateDefaultLabels(
                          updateColumnParam({
                            layer: currentLayer,
                            columnId: column.id,
                            paramName: 'orderBy',
                            value: {
                              type: 'rare',
                              maxDocCount: DEFAULT_MAX_DOC_COUNT,
                            },
                          }),
                          indexPattern
                        ),
                      })
                    );
                  }}
                >
                  {i18n.translate('xpack.lens.indexPattern.switchToRare', {
                    defaultMessage: 'Rank by rarity',
                  })}
                </EuiButton>
              </>
            );
          }
        }
      });
  }

  return warningMessages;
}

export function getVisualDefaultsForLayer(layer: IndexPatternLayer) {
  return Object.keys(layer.columns).reduce<Record<string, Record<string, unknown>>>(
    (memo, columnId) => {
      const column = layer.columns[columnId];
      if (column?.operationType) {
        const opDefinition = operationDefinitionMap[column.operationType];
        const params = opDefinition.getDefaultVisualSettings?.(column);
        if (params) {
          memo[columnId] = params;
        }
      }
      return memo;
    },
    {}
  );
}
