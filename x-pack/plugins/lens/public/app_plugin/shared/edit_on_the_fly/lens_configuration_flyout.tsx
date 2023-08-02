/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, useEffect } from 'react';
import { EuiFlyoutHeader, EuiTitle, EuiAccordion, EuiSpacer } from '@elastic/eui';
import { isOfAggregateQueryType, type AggregateQuery, type Query } from '@kbn/es-query';
import { isEqual } from 'lodash';
import { i18n } from '@kbn/i18n';
import { TextBasedLangEditor } from '@kbn/text-based-languages/public';
import type { Datatable } from '@kbn/expressions-plugin/public';
import { useLensSelector } from '../../../state_management';
import { SuggestionPanel } from '../../../editor_frame_service/editor_frame/suggestion_panel';
import type { EditConfigPanelProps } from './types';
import { LayerConfiguration } from './layer_configuration';
import { FlyoutWrapper } from './flyout_wrapper';
import { useFramePublicApi } from './use_frame_public_api';
import { getLensDataFromQuery } from './helpers';
import { getLensAttributes } from './get_lens_attributes';

export function LensEditConfigurationFlyout({
  attributes,
  coreStart,
  startDependencies,
  visualizationMap,
  datasourceMap,
  datasourceId,
  updateAllAttributes,
  setCurrentAttributes,
  dataView,
  closeFlyout,
  adaptersTables,
  canEditTextBasedQuery,
}: EditConfigPanelProps) {
  const [queryTextBased, setQueryTextBased] = useState<AggregateQuery | Query>(
    attributes.state.query
  );
  const [dataTable, setDataTable] = useState<Datatable | undefined>();
  const [suggestionsPanelIsClosed, setSuggestionsPanelIsClosed] = useState(true);
  const [fetchFromAdapters, setFetchFromAdapters] = useState(true);

  const frameApi = useFramePublicApi({
    attributes,
    datasourceId,
    datasourceMap,
    dataTable,
  });

  useEffect(() => {
    if (
      fetchFromAdapters &&
      adaptersTables &&
      !isEqual(Object.values(adaptersTables)[0], dataTable)
    ) {
      const table = Object.values(adaptersTables)[0];
      setDataTable(table);
    }
  }, [adaptersTables, dataTable, fetchFromAdapters]);

  const runQuery = useCallback(
    async (q: AggregateQuery) => {
      setFetchFromAdapters(false);
      const attrs = await getLensDataFromQuery(
        q,
        dataView,
        startDependencies,
        datasourceMap,
        visualizationMap,
        datasourceId,
        setDataTable
      );
      updateAllAttributes?.(attrs);
      setCurrentAttributes?.(attrs);
    },
    [
      dataView,
      startDependencies,
      datasourceMap,
      visualizationMap,
      updateAllAttributes,
      setCurrentAttributes,
      datasourceId,
    ]
  );

  const { isLoading } = useLensSelector((state) => state.lens);
  if (isLoading) return null;

  // Example is the Discover editing where we dont want to render the text based editor on the panel
  if (!canEditTextBasedQuery) {
    return (
      <FlyoutWrapper datasourceId={datasourceId} closeFlyout={closeFlyout}>
        <LayerConfiguration
          attributes={attributes}
          coreStart={coreStart}
          startDependencies={startDependencies}
          visualizationMap={visualizationMap}
          datasourceMap={datasourceMap}
          datasourceId={datasourceId}
          framePublicAPI={frameApi}
        />
      </FlyoutWrapper>
    );
  }

  return (
    <>
      {isOfAggregateQueryType(attributes.state.query) && (
        <EuiFlyoutHeader hasBorder className="lnsDimensionContainer__header">
          <EuiTitle size="xs">
            <h2 id="Edit Lens configuration">
              {i18n.translate('xpack.lens.config.editLabel', {
                defaultMessage: 'Edit SQL visualization',
              })}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
      )}
      <FlyoutWrapper datasourceId={datasourceId} closeFlyout={closeFlyout}>
        <>
          {isOfAggregateQueryType(attributes.state.query) && (
            <TextBasedLangEditor
              query={attributes.state.query}
              onTextLangQueryChange={(q) => {
                setQueryTextBased(q);
              }}
              expandCodeEditor={(status: boolean) => {}}
              isCodeEditorExpanded={true}
              detectTimestamp={Boolean(dataView?.timeFieldName)}
              errors={[]}
              hideExpandButton={true}
              renderRunButton={true}
              disableSubmitAction={isEqual(queryTextBased, attributes.state.query)}
              onTextLangQuerySubmit={(q) => {
                setSuggestionsPanelIsClosed(true);
                if (q) {
                  runQuery(q);
                }
              }}
              isDisabled={false}
            />
          )}
          <EuiSpacer />
          <EuiAccordion
            id="layer-configuration"
            buttonContent={
              <EuiTitle size="xs">
                <h5>
                  {i18n.translate('xpack.lens.config.layerConfigurationLabel', {
                    defaultMessage: 'Layer configuration',
                  })}
                </h5>
              </EuiTitle>
            }
            initialIsOpen={true}
          >
            <LayerConfiguration
              attributes={attributes}
              coreStart={coreStart}
              startDependencies={startDependencies}
              visualizationMap={visualizationMap}
              datasourceMap={datasourceMap}
              datasourceId={datasourceId}
              framePublicAPI={frameApi}
            />
          </EuiAccordion>
          <EuiSpacer />
          <SuggestionPanel
            ExpressionRenderer={startDependencies.expressions.ReactExpressionRenderer}
            datasourceMap={datasourceMap}
            visualizationMap={visualizationMap}
            frame={frameApi}
            nowProvider={startDependencies.data.nowProvider}
            hiddenByDefault={suggestionsPanelIsClosed}
            customSwitchSuggestionAction={(suggestion) => {
              const attrs = getLensAttributes({
                filters: [],
                query: queryTextBased,
                dataView,
                suggestion,
              });
              updateAllAttributes?.(attrs);
              setCurrentAttributes?.(attrs);
              setSuggestionsPanelIsClosed(false);
            }}
          />
        </>
      </FlyoutWrapper>
    </>
  );
}
