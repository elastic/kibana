/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiButton,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiLink,
  EuiIcon,
  EuiToolTip,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
  EuiCallOut,
} from '@elastic/eui';
import { isEqual } from 'lodash';
import type { Observable } from 'rxjs';
import { euiThemeVars } from '@kbn/ui-theme';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import type { CoreStart } from '@kbn/core/public';
import type { Datatable } from '@kbn/expressions-plugin/public';
import type { LensPluginStartDependencies } from '../../../plugin';
import {
  useLensSelector,
  selectFramePublicAPI,
  useLensDispatch,
  updateIndexPatterns,
} from '../../../state_management';
import { replaceIndexpattern } from '../../../state_management/lens_slice';
import { VisualizationToolbar } from '../../../editor_frame_service/editor_frame/workspace_panel';

import type { DatasourceMap, VisualizationMap } from '../../../types';
import type { TypedLensByValueInput } from '../../../embeddable/embeddable_component';
import type { LensEmbeddableOutput } from '../../../embeddable';
import type { LensInspector } from '../../../lens_inspector_service';
import { ConfigPanelWrapper } from '../../../editor_frame_service/editor_frame/config_panel/config_panel';
import { extractReferencesFromState } from '../../../utils';
import type { Document } from '../../../persistence';
import { createIndexPatternService } from '../../../data_views_service/service';

export interface EditConfigPanelProps {
  coreStart: CoreStart;
  startDependencies: LensPluginStartDependencies;
  visualizationMap: VisualizationMap;
  datasourceMap: DatasourceMap;
  /** The attributes of the Lens embeddable */
  attributes: TypedLensByValueInput['attributes'];
  /** Callback for updating the visualization and datasources state */
  updatePanelState: (datasourceState: unknown, visualizationState: unknown) => void;
  /** Lens visualizations can be either created from ESQL (textBased) or from dataviews (formBased) */
  datasourceId: 'formBased' | 'textBased';
  /** Embeddable output observable, useful for dashboard flyout  */
  output$?: Observable<LensEmbeddableOutput>;
  /** Contains the active data, necessary for some panel configuration such as coloring */
  lensAdapters?: LensInspector['adapters'];
  /** Optional callback called when updating the by reference embeddable */
  updateByRefInput?: (soId: string) => void;
  /** Callback for closing the edit flyout */
  closeFlyout?: () => void;
  /** Boolean used for adding a flyout wrapper */
  wrapInFlyout?: boolean;
  /** Optional parameter for panel identification
   * If not given, Lens generates a new one
   */
  panelId?: string;
  /** Optional parameter for saved object id
   * Should be given if the lens embeddable is a by reference one
   * (saved in the library)
   */
  savedObjectId?: string;
  /** Callback for saving the embeddable as a SO */
  saveByRef?: (attrs: Document) => void;
  /** Optional callback for navigation from the header of the flyout */
  navigateToLensEditor?: () => void;
  /** If set to true it displays a header on the flyout */
  displayFlyoutHeader?: boolean;
}

export function LensEditConfigurationFlyout({
  attributes,
  coreStart,
  startDependencies,
  visualizationMap,
  datasourceMap,
  datasourceId,
  updatePanelState,
  closeFlyout,
  saveByRef,
  savedObjectId,
  updateByRefInput,
  output$,
  lensAdapters,
  navigateToLensEditor,
  displayFlyoutHeader,
}: EditConfigPanelProps) {
  const previousAttributes = useRef<TypedLensByValueInput['attributes']>(attributes);
  const datasourceState = attributes.state.datasourceStates[datasourceId];
  const activeVisualization = visualizationMap[attributes.visualizationType];
  const activeDatasource = datasourceMap[datasourceId];
  const [isInlineFooterVisible, setIsInlineFlyoutFooterVisible] = useState(true);
  const { euiTheme } = useEuiTheme();
  const { datasourceStates, visualization, isLoading } = useLensSelector((state) => state.lens);
  const dispatch = useLensDispatch();
  const activeData: Record<string, Datatable> = useMemo(() => {
    return {};
  }, []);
  useEffect(() => {
    const s = output$?.subscribe(() => {
      const layers = activeDatasource.getLayers(datasourceState);
      const adaptersTables = lensAdapters?.tables?.tables as Record<string, Datatable>;
      const [table] = Object.values(adaptersTables || {});
      layers.forEach((layer) => {
        if (table) {
          activeData[layer] = table;
        }
      });
    });
    return () => s?.unsubscribe();
  }, [activeDatasource, lensAdapters, datasourceState, output$, activeData]);

  const attributesChanged: boolean = useMemo(() => {
    const previousAttrs = previousAttributes.current;

    const datasourceStatesAreSame =
      datasourceStates[datasourceId].state && previousAttrs.state.datasourceStates[datasourceId]
        ? datasourceMap[datasourceId].isEqual(
            previousAttrs.state.datasourceStates[datasourceId],
            previousAttrs.references,
            datasourceStates[datasourceId].state,
            attributes.references
          )
        : false;

    const visualizationState = visualization.state;
    return (
      !isEqual(visualizationState, previousAttrs.state.visualization) || !datasourceStatesAreSame
    );
  }, [attributes.references, datasourceId, datasourceMap, datasourceStates, visualization.state]);

  const onCancel = useCallback(() => {
    const previousAttrs = previousAttributes.current;

    if (attributesChanged) {
      const currentDatasourceState = datasourceMap[datasourceId].injectReferencesToLayers
        ? datasourceMap[datasourceId]?.injectReferencesToLayers?.(
            previousAttrs.state.datasourceStates[datasourceId],
            previousAttrs.references
          )
        : previousAttrs.state.datasourceStates[datasourceId];
      updatePanelState?.(currentDatasourceState, previousAttrs.state.visualization);
      if (savedObjectId) {
        updateByRefInput?.(savedObjectId);
      }
    }
    closeFlyout?.();
  }, [
    attributesChanged,
    savedObjectId,
    closeFlyout,
    datasourceMap,
    datasourceId,
    updatePanelState,
    updateByRefInput,
  ]);

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

  const indexPatternService = useMemo(
    () =>
      createIndexPatternService({
        dataViews: startDependencies.dataViews,
        uiActions: startDependencies.uiActions,
        core: coreStart,
        updateIndexPatterns: (newIndexPatternsState, options) => {
          dispatch(updateIndexPatterns(newIndexPatternsState));
        },
        replaceIndexPattern: (newIndexPattern, oldId, options) => {
          dispatch(replaceIndexpattern({ newIndexPattern, oldId }));
        },
      }),
    [coreStart, dispatch, startDependencies.dataViews, startDependencies.uiActions]
  );

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
    indexPatternService,
    setIsInlineFlyoutFooterVisible,
  };
  return (
    <>
      <EuiFlyoutBody
        className="lnsEditFlyoutBody"
        css={css`
          // styles needed to display extra drop targets that are outside of the config panel main area
          overflow-y: auto;
          padding-left: ${euiThemeVars.euiFormMaxWidth};
          margin-left: -${euiThemeVars.euiFormMaxWidth};
          pointer-events: none;
          .euiFlyoutBody__overflow {
            padding-left: inherit;
            margin-left: inherit;
            > * {
              pointer-events: auto;
            }
          }
          .euiFlyoutBody__overflowContent {
            padding: 0;
          }
        `}
      >
        <EuiFlexGroup gutterSize="s" direction="column">
          {displayFlyoutHeader && (
            <EuiFlexItem
              data-test-subj="editFlyoutHeader"
              css={css`
                padding: ${euiThemeVars.euiSizeL};
                border-block-end: 1px solid ${euiThemeVars.euiBorderColor};
              `}
            >
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup alignItems="center" gutterSize="xs">
                    <EuiFlexItem grow={false}>
                      <EuiTitle size="xs">
                        <h2 id="Edit visualization">
                          {i18n.translate('xpack.lens.config.editVisualizationLabel', {
                            defaultMessage: 'Edit visualization',
                          })}
                        </h2>
                      </EuiTitle>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiToolTip
                        content={i18n.translate('xpack.lens.config.experimentalLabel', {
                          defaultMessage: 'Technical preview',
                        })}
                      >
                        <EuiIcon type="beaker" size="m" />
                      </EuiToolTip>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                {navigateToLensEditor && (
                  <EuiFlexItem grow={false}>
                    <EuiLink
                      onClick={navigateToLensEditor}
                      data-test-subj="navigateToLensEditorLink"
                    >
                      {i18n.translate('xpack.lens.config.editLinkLabel', {
                        defaultMessage: 'Edit in Lens',
                      })}
                    </EuiLink>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
          <EuiFlexItem
            css={css`
              padding: ${euiTheme.size.s};
            `}
          >
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
            <ConfigPanelWrapper
              {...layerPanelsProps}
              css={css`
                padding: ${euiTheme.size.s};
              `}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
      {isInlineFooterVisible && (
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={onCancel}
                flush="left"
                aria-label={i18n.translate('xpack.lens.config.cancelFlyoutAriaLabel', {
                  defaultMessage: 'Cancel applied changes',
                })}
                data-test-subj="cancelFlyoutButton"
              >
                <FormattedMessage
                  id="xpack.lens.config.cancelFlyoutLabel"
                  defaultMessage="Cancel"
                />
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
                data-test-subj="applyFlyoutButton"
              >
                <FormattedMessage
                  id="xpack.lens.config.applyFlyoutLabel"
                  defaultMessage="Apply and close"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      )}
    </>
  );
}
