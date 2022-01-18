/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DocLinksStart } from 'kibana/public';
import { EuiLink, EuiTextColor } from '@elastic/eui';

import { DatatableColumn } from 'src/plugins/expressions';
import type { FramePublicAPI } from '../types';
import type { IndexPattern, IndexPatternLayer, IndexPatternPrivateState } from './types';
import type { ReferenceBasedIndexPatternColumn } from './operations/definitions/column_types';

import { operationDefinitionMap, GenericIndexPatternColumn } from './operations';

import { getInvalidFieldMessage } from './operations/definitions/helpers';
import { isQueryValid } from './operations/definitions/filters';
import { checkColumnForPrecisionError } from '../../../../../src/plugins/data/common';
import { hasField } from './pure_utils';

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
  docLinks: DocLinksStart
) {
  const warningMessages: React.ReactNode[] = [];

  if (state && activeData) {
    Object.values(activeData)
      .reduce((acc: DatatableColumn[], { columns }) => [...acc, ...columns], [])
      .forEach((column) => {
        if (checkColumnForPrecisionError(column)) {
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
