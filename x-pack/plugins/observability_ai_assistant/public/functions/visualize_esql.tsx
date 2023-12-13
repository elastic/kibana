/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiToolTip,
  EuiButtonIcon,
} from '@elastic/eui';
import { getIndexPatternFromESQLQuery } from '@kbn/es-query';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { getLensAttributes } from '@kbn/visualization-utils';
import type { LensPublicStart, TypedLensByValueInput } from '@kbn/lens-plugin/public';
import React, { useState, useEffect } from 'react';
import useAsync from 'react-use/lib/useAsync';
import type { VisualizeESQLFunctionArguments } from '../../common/functions/visualize_esql';
import type {
  ObservabilityAIAssistantPluginStartDependencies,
  ObservabilityAIAssistantService,
  RegisterRenderFunctionDefinition,
  RenderFunction,
} from '../types';
import { type ChatActionClickHandler, ChatActionClickType } from '../components/chat/types';

interface VisualizeLensResponse {
  content: DatatableColumn[];
}
function generateId() {
  return uuidv4();
}

function VisualizeESQL({
  lens,
  dataViews,
  uiActions,
  columns,
  query,
  onActionClick,
  initialInput,
}: {
  lens: LensPublicStart;
  dataViews: DataViewsServicePublic;
  uiActions: UiActionsStart;
  columns: DatatableColumn[];
  query: string;
  onActionClick: ChatActionClickHandler;
  initialInput?: unknown;
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
  const [lensInput, setLensInput] = useState<TypedLensByValueInput | undefined>(
    initialInput as TypedLensByValueInput
  );

  // initialization
  useEffect(() => {
    if (lensHelpersAsync.value && dataViewAsync.value && !lensInput) {
      const context = {
        dataViewSpec: dataViewAsync.value?.toSpec(),
        fieldName: '',
        textBasedColumns: columns,
        query: {
          esql: query,
        },
      };

      const chartSuggestions = lensHelpersAsync.value.suggestions(context, dataViewAsync.value);
      if (chartSuggestions?.length) {
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
        setLensInput(lensEmbeddableInput);
      }
    }
  }, [columns, dataViewAsync.value, lensHelpersAsync.value, lensInput, query]);

  if (!lensHelpersAsync.value || !dataViewAsync.value || !lensInput) {
    return <EuiLoadingSpinner />;
  }

  const triggerOptions = {
    ...lensInput,
    onUpdate: (newAttributes: TypedLensByValueInput['attributes']) => {
      const newInput = {
        ...lensInput,
        attributes: newAttributes,
      };
      setLensInput(newInput);
    },
    onApply: (newAttributes: TypedLensByValueInput['attributes']) => {
      const newInput = {
        ...lensInput,
        attributes: newAttributes,
      };
      // this should run on apply and close
      onActionClick({ type: ChatActionClickType.updateVisualization, newInput, query });
    },
  };

  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="row" gutterSize="s" justifyContent="flexEnd">
            <EuiToolTip
              content={i18n.translate('xpack.observabilityAiAssistant.lensESQLFunction.edit', {
                defaultMessage: 'Edit visualization',
              })}
            >
              <EuiButtonIcon
                size="xs"
                iconType="pencil"
                onClick={() => uiActions.getTrigger('IN_APP_EDIT_TRIGGER').exec(triggerOptions)}
                data-test-subj="observabilityAiAssistantLensESQLEditButton"
                aria-label={i18n.translate('xpack.observabilityAiAssistant.lensESQLFunction.edit', {
                  defaultMessage: 'Edit visualization',
                })}
              />
            </EuiToolTip>
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={i18n.translate('xpack.observabilityAiAssistant.lensESQLFunction.save', {
                  defaultMessage: 'Save visualization',
                })}
              >
                <EuiButtonIcon
                  size="xs"
                  iconType="save"
                  onClick={() => setIsSaveModalOpen(true)}
                  data-test-subj="observabilityAiAssistantLensESQLSaveButton"
                  aria-label={i18n.translate(
                    'xpack.observabilityAiAssistant.lensESQLFunction.save',
                    {
                      defaultMessage: 'Save visualization',
                    }
                  )}
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <lens.EmbeddableComponent
            {...lensInput}
            style={{
              height: 240,
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {isSaveModalOpen ? (
        <lens.SaveModalComponent
          initialInput={lensInput}
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
      arguments: { query, newInput },
      response,
      onActionClick,
    }: Parameters<RenderFunction<VisualizeESQLFunctionArguments, {}>>[0]) => {
      const { content } = response as VisualizeLensResponse;
      return (
        <VisualizeESQL
          lens={pluginsStart.lens}
          dataViews={pluginsStart.dataViews}
          uiActions={pluginsStart.uiActions}
          columns={content}
          query={query}
          onActionClick={onActionClick}
          initialInput={newInput}
        />
      );
    }
  );
}
