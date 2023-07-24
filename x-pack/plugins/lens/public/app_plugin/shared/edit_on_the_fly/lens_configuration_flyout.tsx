/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
  EuiCallOut,
  EuiFlyoutHeader,
  EuiTitle,
  // EuiAccordion,
} from '@elastic/eui';
import { isOfAggregateQueryType, type AggregateQuery, type Query } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import type { CoreStart } from '@kbn/core/public';
import type { Datatable } from '@kbn/expressions-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { TextBasedLangEditor } from '@kbn/text-based-languages/public';
import type { LensPluginStartDependencies } from '../../../plugin';
import { useLensSelector, selectFramePublicAPI } from '../../../state_management';
import { VisualizationToolbar } from '../../../editor_frame_service/editor_frame/workspace_panel';

import type { DatasourceMap, VisualizationMap } from '../../../types';
import type { TypedLensByValueInput } from '../../../embeddable/embeddable_component';
import { ConfigPanelWrapper } from '../../../editor_frame_service/editor_frame/config_panel/config_panel';

export interface EditConfigPanelProps {
  attributes: TypedLensByValueInput['attributes'];
  dataView: DataView;
  updateAll: (datasourceState: unknown, visualizationState: unknown) => void;
  coreStart: CoreStart;
  startDependencies: LensPluginStartDependencies;
  visualizationMap: VisualizationMap;
  datasourceMap: DatasourceMap;
  closeFlyout?: () => void;
  wrapInFlyout?: boolean;
  panelId?: string;
  datasourceId: 'formBased' | 'textBased';
  adaptersTables?: Record<string, Datatable>;
  canEditTextBasedQuery?: boolean;
}

export function LensEditConfigurationFlyout({
  attributes,
  coreStart,
  startDependencies,
  visualizationMap,
  datasourceMap,
  datasourceId,
  updateAll,
  closeFlyout,
  adaptersTables,
  canEditTextBasedQuery,
}: EditConfigPanelProps) {
  const datasourceState = attributes.state.datasourceStates[datasourceId];
  const activeVisualization = visualizationMap[attributes.visualizationType];
  const activeDatasource = datasourceMap[datasourceId];
  const { euiTheme } = useEuiTheme();
  const query = attributes.state.query;
  const [queryTextBased, setQueryTextBased] = useState<AggregateQuery | Query>(query);

  const activeData: Record<string, Datatable> = useMemo(() => {
    return {};
  }, []);
  const layers = activeDatasource.getLayers(datasourceState);
  layers.forEach((layer) => {
    if (adaptersTables) {
      activeData[layer] = Object.values(adaptersTables)[0];
    }
  });

  const framePublicAPI = useLensSelector((state) => {
    const newState = {
      ...state,
      lens: {
        ...state.lens,
        activeData,
      },
    };
    return selectFramePublicAPI(newState, datasourceMap);
  });
  const { isLoading } = useLensSelector((state) => state.lens);
  if (isLoading) return null;

  const layerPanelsProps = {
    framePublicAPI,
    datasourceMap,
    visualizationMap,
    core: coreStart,
    dataViews: startDependencies.dataViews,
    uiActions: startDependencies.uiActions,
    hideLayerHeader: datasourceId === 'textBased',
    onUpdateStateCb: updateAll,
  };
  return (
    <>
      {canEditTextBasedQuery && isOfAggregateQueryType(query) && (
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
      <EuiFlyoutBody
        className="lnsEditFlyoutBody"
        css={css`
          .euiFlyoutBody__overflowContent {
            padding: ${euiTheme.size.s};
          }
        `}
      >
        {datasourceId === 'textBased' && (
          <EuiCallOut
            size="s"
            title={i18n.translate('xpack.lens.config.configFlyoutCallout', {
              defaultMessage: 'SQL currently offers limited configuration options',
            })}
            iconType="iInCircle"
          />
        )}
        {canEditTextBasedQuery && isOfAggregateQueryType(queryTextBased) && (
          <TextBasedLangEditor
            query={queryTextBased}
            onTextLangQueryChange={(q) => {}}
            expandCodeEditor={(status: boolean) => {}}
            isCodeEditorExpanded={true}
            errors={[]}
            hideExpandButton={true}
            renderRunButton={true}
            onTextLangQuerySubmit={(q) => {
              if (q) {
                setQueryTextBased(q);
              }
            }}
            isDisabled={false}
          />
        )}
        {/* <EuiAccordion
          id="layer-configuration"
          buttonContent={i18n.translate('xpack.lens.config.layerConfigurationLabel', {
            defaultMessage: 'Layer configuration',
          })}
          initialIsOpen={true}
        > */}
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem>
            <EuiSpacer size="m" />
            <VisualizationToolbar
              activeVisualization={activeVisualization}
              framePublicAPI={framePublicAPI}
              onUpdateStateCb={updateAll}
            />
            <EuiSpacer size="m" />
            <ConfigPanelWrapper {...layerPanelsProps} />
          </EuiFlexItem>
        </EuiFlexGroup>
        {/* </EuiAccordion> */}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButtonEmpty
          onClick={closeFlyout}
          data-test-subj="collapseFlyoutButton"
          aria-controls="lens-config-close-button"
          aria-expanded="true"
          aria-label={i18n.translate('xpack.lens.config.closeFlyoutAriaLabel', {
            defaultMessage: 'Close flyout',
          })}
        >
          <FormattedMessage id="xpack.lens.config.closeFlyoutLabel" defaultMessage="Close" />
        </EuiButtonEmpty>
      </EuiFlyoutFooter>
    </>
  );
}
