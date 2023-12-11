/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { getIndexPatternFromESQLQuery } from '@kbn/es-query';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { getLensAttributes } from '@kbn/visualization-utils';
import type { LensPublicStart, TypedLensByValueInput } from '@kbn/lens-plugin/public';
import React, { useState } from 'react';
import useAsync from 'react-use/lib/useAsync';
import type { VisualizeESQLFunctionArguments } from '../../common/functions/visualize_esql';
import type {
  ObservabilityAIAssistantPluginStartDependencies,
  ObservabilityAIAssistantService,
  RegisterRenderFunctionDefinition,
  RenderFunction,
} from '../types';

interface VisualizeLensResponse {
  content: DatatableColumn[];
}
function generateId() {
  return uuidv4();
}

function ESQLLens({
  lens,
  dataViews,
  columns,
  query,
}: {
  lens: LensPublicStart;
  dataViews: DataViewsServicePublic;
  columns: DatatableColumn[];
  query: string;
}) {
  // fetch the pattern from the query
  const indexPattern = getIndexPatternFromESQLQuery(query);
  const lensHelpersAsync = useAsync(() => {
    return lens.stateHelperApi();
  }, [lens]);

  const dataViewAsync = useAsync(() => {
    return dataViews.create({
      title: indexPattern,
    });
  }, [indexPattern]);

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  if (!lensHelpersAsync.value || !dataViewAsync.value) {
    return <EuiLoadingSpinner />;
  }

  const context = {
    dataViewSpec: dataViewAsync.value?.toSpec(),
    fieldName: '',
    textBasedColumns: columns,
    query: {
      esql: query,
    },
  };

  const chartSuggestions = lensHelpersAsync.value.suggestions(context, dataViewAsync.value);

  // Lens might not return suggestions for some cases, i.e. in case of errors
  if (!chartSuggestions?.length) return null;
  const [firstSuggestion] = chartSuggestions;

  const attrs = getLensAttributes({
    filters: [],
    query: {
      esql: query,
    },
    suggestion: firstSuggestion,
    dataView: dataViewAsync.value,
  }) as TypedLensByValueInput['attributes'];

  const lensEmbeddableInput = {
    attributes: attrs,
    id: generateId(),
  };

  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="row" gutterSize="s" justifyContent="flexEnd">
            {/* <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="observabilityAiAssistantLensOpenInLensButton"
                iconType="lensApp"
                onClick={() => {
                  lens.navigateToPrefilledEditor(lensEmbeddableInput);
                }}
              >
                {i18n.translate('xpack.observabilityAiAssistant.lensFunction.openInLens', {
                  defaultMessage: 'Open in Lens',
                })}
              </EuiButton>
            </EuiFlexItem> */}
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="observabilityAiAssistantLensSaveButton"
                iconType="save"
                onClick={() => {
                  setIsSaveModalOpen(() => true);
                }}
              >
                {i18n.translate('xpack.observabilityAiAssistant.lensFunction.save', {
                  defaultMessage: 'Save',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <lens.EmbeddableComponent
            {...lensEmbeddableInput}
            style={{
              height: 240,
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {isSaveModalOpen ? (
        <lens.SaveModalComponent
          initialInput={lensEmbeddableInput}
          onClose={() => {
            setIsSaveModalOpen(() => false);
          }}
          // For now, we don't want to allow saving ESQL charts to the library
          isSaveable={false}
        />
      ) : null}
    </>
  );
}

export function registerVisualizeQueryRenderFunction({
  service,
  registerRenderFunction,
  pluginsStart,
}: {
  service: ObservabilityAIAssistantService;
  registerRenderFunction: RegisterRenderFunctionDefinition;
  pluginsStart: ObservabilityAIAssistantPluginStartDependencies;
}) {
  registerRenderFunction(
    'visualize_query',
    ({
      arguments: { query },
      response,
    }: Parameters<RenderFunction<VisualizeESQLFunctionArguments, {}>>[0]) => {
      const { content } = response as VisualizeLensResponse;
      return (
        <ESQLLens
          lens={pluginsStart.lens}
          dataViews={pluginsStart.dataViews}
          columns={content}
          query={query}
        />
      );
    }
  );
}
