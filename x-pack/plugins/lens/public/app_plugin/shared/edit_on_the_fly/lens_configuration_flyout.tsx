/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useRef } from 'react';
import {
  EuiButtonEmpty,
  EuiButton,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
  EuiCallOut,
} from '@elastic/eui';
import { isEqual } from 'lodash';
import { euiThemeVars } from '@kbn/ui-theme';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import type { CoreStart } from '@kbn/core/public';
import type { Datatable } from '@kbn/expressions-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { LensPluginStartDependencies } from '../../../plugin';
import { useLensSelector, selectFramePublicAPI } from '../../../state_management';
import { VisualizationToolbar } from '../../../editor_frame_service/editor_frame/workspace_panel';

import type { DatasourceMap, VisualizationMap } from '../../../types';
import type { TypedLensByValueInput } from '../../../embeddable/embeddable_component';
import { ConfigPanelWrapper } from '../../../editor_frame_service/editor_frame/config_panel/config_panel';
import { extractReferencesFromState } from '../../../utils';
import type { Document } from '../../../persistence';

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
  savedObjectId?: string;
  datasourceId: 'formBased' | 'textBased';
  adaptersTables?: Record<string, Datatable>;
  saveByRef?: (attrs: Document) => void;
  updateByRefInput?: (soId: string) => void;
}

export function LensEditConfigurationFlyout({
  attributes,
  dataView,
  coreStart,
  startDependencies,
  visualizationMap,
  datasourceMap,
  datasourceId,
  updateAll,
  closeFlyout,
  adaptersTables,
  saveByRef,
  savedObjectId,
  updateByRefInput,
}: EditConfigPanelProps) {
  const previousAttributes = useRef<TypedLensByValueInput['attributes']>(attributes);
  const datasourceState = attributes.state.datasourceStates[datasourceId];
  const activeVisualization = visualizationMap[attributes.visualizationType];
  const activeDatasource = datasourceMap[datasourceId];
  const { euiTheme } = useEuiTheme();
  const { datasourceStates, visualization, isLoading } = useLensSelector((state) => state.lens);

  const attributesChanged: boolean = useMemo(() => {
    const attrs = previousAttributes.current;
    const prevLayers = datasourceMap[datasourceId].getCurrentLayersState?.(
      attrs.state.datasourceStates[datasourceId]
    );

    const visualizationState = visualization.state;
    const datasourceLayers = datasourceMap[datasourceId].getCurrentLayersState?.(
      datasourceStates[datasourceId].state
    );
    return (
      !isEqual(visualizationState, attrs.state.visualization) ||
      !isEqual(datasourceLayers, prevLayers)
    );
  }, [datasourceId, datasourceMap, datasourceStates, visualization.state]);

  const onCancel = useCallback(() => {
    const attrs = previousAttributes.current;
    if (attributesChanged) {
      // needs to be updated with indexPatternId
      updateAll?.(attrs.state.datasourceStates[datasourceId], attrs.state.visualization);
    }
    if (savedObjectId) {
      updateByRefInput?.(savedObjectId);
    }
    closeFlyout?.();
  }, [attributesChanged, savedObjectId, closeFlyout, updateAll, datasourceId, updateByRefInput]);

  const onApply = useCallback(() => {
    if (savedObjectId) {
      const dsStates = Object.fromEntries(
        Object.entries(datasourceStates).map(([id, ds]) => {
          const dsState = ds.state;
          return [id, dsState];
        })
      );
      const references = extractReferencesFromState({
        activeDatasources: Object.keys(datasourceStates).reduce(
          (acc, id) => ({
            ...acc,
            [id]: datasourceMap[id],
          }),
          {}
        ),
        datasourceStates,
        visualizationState: visualization.state,
        activeVisualization,
      });
      const attrs = {
        ...attributes,
        state: {
          ...attributes.state,
          visualization: visualization.state,
          datasourceStates: dsStates,
        },
        references,
      };
      saveByRef?.(attrs);
      updateByRefInput?.(savedObjectId);
    }
    closeFlyout?.();
  }, [
    savedObjectId,
    closeFlyout,
    datasourceStates,
    visualization.state,
    activeVisualization,
    attributes,
    saveByRef,
    updateByRefInput,
    datasourceMap,
  ]);

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
  if (isLoading) return null;

  const layerPanelsProps = {
    framePublicAPI,
    datasourceMap,
    visualizationMap,
    core: coreStart,
    dataViews: startDependencies.dataViews,
    uiActions: startDependencies.uiActions,
    hideLayerHeader: datasourceId === 'textBased',
  };
  return (
    <>
      <EuiFlyoutBody
        className="lnsEditFlyoutBody"
        css={css`
          // styles needed to display extra drop targets that are outside of the config panel main area while also allowing to scroll vertically
          overflow-y: scroll;
          padding-left: ${euiThemeVars.euiFormMaxWidth};
          margin-left: -${euiThemeVars.euiFormMaxWidth};
          pointer-events: none !important;
          .euiFlyoutBody__overflow {
            padding-left: inherit;
            margin-left: inherit;
            > * {
              pointer-events: auto;
            }
          }
          .euiFlyoutBody__overflowContent {
            padding: ${euiTheme.size.s};
          }
        `}
      >
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem>
            {datasourceId === 'textBased' && (
              <EuiCallOut
                size="s"
                title={i18n.translate('xpack.lens.config.configFlyoutCallout', {
                  defaultMessage: 'ES|QL currently offers limited configuration options',
                })}
                iconType="iInCircle"
              />
            )}
            <EuiSpacer size="m" />
            <VisualizationToolbar
              activeVisualization={activeVisualization}
              framePublicAPI={framePublicAPI}
            />
            <EuiSpacer size="m" />
            <ConfigPanelWrapper {...layerPanelsProps} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onCancel}
              flush="left"
              aria-label={i18n.translate('xpack.lens.config.cancelFlyoutAriaLabel', {
                defaultMessage: 'Cancel applied changes',
              })}
              data-test-subj="collapseFlyoutButton"
            >
              <FormattedMessage id="xpack.lens.config.cancelFlyoutLabel" defaultMessage="Cancel" />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={onApply}
              fill
              aria-label={i18n.translate('xpack.lens.config.applyFlyoutAriaLabel', {
                defaultMessage: 'Apply changes',
              })}
              iconType="check"
              isDisabled={!attributesChanged}
            >
              <FormattedMessage
                id="xpack.lens.config.applyFlyoutLabel"
                defaultMessage="Apply and close"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
}
