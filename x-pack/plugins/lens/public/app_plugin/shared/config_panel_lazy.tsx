/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  EuiPanel,
  EuiFormRow,
  EuiText,
  EuiIconTip,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  // EuiFocusTrap,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  // EuiOutsideClickDetector,
  EuiFocusTrap,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { DimensionButton } from '@kbn/visualization-ui-components/public';
import { DataViewsState } from '../../state_management';
import { getResolvedDateRange } from '../../utils';

import type { ActiveDimensionState } from '../../editor_frame_service/editor_frame/config_panel/types';
import { DimensionContainer } from '../../editor_frame_service/editor_frame/config_panel/dimension_container';
import { LayerSettings } from '../../editor_frame_service/editor_frame/config_panel/layer_settings';
import { EmptyDimensionButton } from '../../editor_frame_service/editor_frame/config_panel/buttons/empty_dimension_button';
import { NativeRenderer } from '../../native_renderer';
import type { LensPluginStartDependencies } from '../../plugin';
import type { DatasourceMap, VisualizationMap, DatasourceLayers } from '../../types';
import type { TypedLensByValueInput } from '../../embeddable/embeddable_component';
import { DONT_CLOSE_DIMENSION_CONTAINER_ON_CLICK_CLASS } from '../../utils';

function fromExcludedClickTarget(event: Event) {
  for (
    let node: HTMLElement | null = event.target as HTMLElement;
    node !== null;
    node = node!.parentElement
  ) {
    if (
      node.classList!.contains(DONT_CLOSE_DIMENSION_CONTAINER_ON_CLICK_CLASS) ||
      node.classList!.contains('euiBody-hasPortalContent') ||
      node.classList!.contains('euiFormRow') ||
      node.getAttribute('data-euiportal') === 'true'
    ) {
      return true;
    }
  }
  return false;
}
const initialActiveDimensionState = {
  isNew: false,
};

export function getConfigPanel(
  coreStart: CoreStart,
  startDependencies: LensPluginStartDependencies,
  visualizationMap?: VisualizationMap,
  datasourceMap?: DatasourceMap
) {
  return (props: {
    attributes: TypedLensByValueInput['attributes'];
    dataView: DataView;
    updateAll: (datasourceState: unknown, visualizationState: unknown) => void;
    setIsFlyoutVisible?: (flag: boolean) => void;
    datasourceId?: 'formBased' | 'textBased';
  }) => {
    const [activeDimension, setActiveDimension] = useState<ActiveDimensionState>(
      initialActiveDimensionState
    );
    const [attributes, setAttributes] = useState(props.attributes);
    const datasourceId = props?.datasourceId ?? 'textBased';

    const updateVisualizationState = useCallback(
      (newState) => {
        const attrs = {
          ...attributes,
          state: {
            ...attributes.state,
            visualization: newState,
          },
        };
        const dsState = attributes.state.datasourceStates[datasourceId];
        setAttributes(attrs);
        props.updateAll(dsState, newState);
      },
      [attributes, datasourceId, props]
    );

    const updateDatasourceState = useCallback(
      (newState) => {
        props.updateAll(newState, undefined);
        const attrs = {
          ...attributes,
          state: {
            ...attributes.state,
            datasourceStates: {
              ...attributes.state.datasourceStates,
              [datasourceId]: newState,
            },
          },
        };
        setAttributes(attrs);
      },
      [attributes, datasourceId, props]
    );

    const updateAll = useCallback(
      (newState, newVisualizationState) => {
        const attrs = {
          ...attributes,
          state: {
            ...attributes.state,
            visualization: newVisualizationState,
            datasourceStates: {
              ...attributes.state.datasourceStates,
              [datasourceId]: newState,
            },
          },
        };
        setAttributes(attrs);
        props.updateAll(newState, newVisualizationState);
      },
      [attributes, datasourceId, props]
    );

    const closeFlyout = () => {
      props.setIsFlyoutVisible?.(false);
      setActiveDimension(initialActiveDimensionState);
    };
    const panelRef = useRef<HTMLDivElement | null>(null);

    if (!datasourceMap || !visualizationMap || !props.dataView.id) return null;
    const { activeId, activeGroup } = activeDimension;
    const isDimensionPanelOpen = Boolean(activeDimension?.activeId);
    const activeVisualization = visualizationMap[attributes.visualizationType];
    const currentDataViewId = props.dataView.id;
    const dataViews = useMemo(() => {
      return {
        indexPatterns: {
          [currentDataViewId]: props.dataView,
        },
        indexPatternRefs: [],
      } as unknown as DataViewsState;
    }, [currentDataViewId, props.dataView]);

    const layerIds = activeVisualization.getLayerIds(attributes.state.visualization);
    const dateRange = getResolvedDateRange(startDependencies.data.query.timefilter.timefilter);
    const datasourceStates = attributes.state.datasourceStates;
    const datasourceLayers: DatasourceLayers = useMemo(() => {
      return {};
    }, []);
    const activeDatasource = datasourceMap[datasourceId];
    const layers = activeDatasource.getLayers(datasourceStates[datasourceId]);

    const datasourceState = datasourceStates[datasourceId];
    layers.forEach((layer) => {
      datasourceLayers[layer] = datasourceMap[datasourceId].getPublicAPI({
        state: datasourceState,
        layerId: layer,
        indexPatterns: dataViews.indexPatterns,
      });
    });

    const framePublicAPI = useMemo(() => {
      return {
        activeData: {},
        dataViews,
        datasourceLayers,
        dateRange,
      };
    }, [dataViews, datasourceLayers, dateRange]);
    const { groups } = activeVisualization.getConfiguration({
      layerId: layerIds[0],
      frame: framePublicAPI,
      state: attributes.state.visualization,
    });
    const layerId = layerIds[0];
    const isEmptyLayer = !groups.some((d) => d.accessors.length > 0);
    const layerDatasource = datasourceMap[datasourceId];
    const layerDatasourceState = datasourceState;
    const visualizationState = attributes.state.visualization;
    const columnLabelMap = activeVisualization?.getUniqueLabels?.(visualizationState);
    const layerDatasourceConfigProps = {
      state: layerDatasourceState,
      setState: (newState: unknown) => {
        updateDatasourceState(newState);
      },
      layerId,
      frame: framePublicAPI,
      dateRange: framePublicAPI.dateRange,
    };
    const layerVisualizationConfigProps = {
      layerId,
      state: visualizationState,
      frame: framePublicAPI,
      dateRange,
      activeData: framePublicAPI.activeData,
    };
    const [datasource] = Object.values(framePublicAPI.datasourceLayers);

    const removeDimension = useCallback(
      (dimensionProps) => {
        const nextVisState = activeVisualization.removeDimension({
          layerId,
          columnId: dimensionProps.columnId,
          prevState: visualizationState,
          frame: framePublicAPI,
        });
        const dsState = activeDatasource?.removeColumn({
          layerId: dimensionProps.layerId,
          columnId: dimensionProps.columnId,
          prevState: datasourceState,
          indexPatterns: dataViews.indexPatterns,
        });
        updateAll(dsState, nextVisState);
      },
      [
        activeDatasource,
        activeVisualization,
        dataViews.indexPatterns,
        datasourceState,
        framePublicAPI,
        layerId,
        updateAll,
        visualizationState,
      ]
    );

    const allAccessors = groups.flatMap((group) =>
      group.accessors.map((accessor) => accessor.columnId)
    );
    const updateDataLayerState = useCallback(
      (
        newState: unknown,
        { isDimensionComplete = true }: { isDimensionComplete?: boolean } = {}
      ) => {
        if (!activeGroup || !activeId) {
          return;
        }
        if (allAccessors.includes(activeId)) {
          if (isDimensionComplete) {
            updateDatasourceState(newState);
          } else {
            // The datasource can indicate that the previously-valid column is no longer
            // complete, which clears the visualization. This keeps the flyout open and reuses
            // the previous columnId
            updateDatasourceState(newState);
            removeDimension({ layerId, columnId: activeId });
          }
        } else if (isDimensionComplete) {
          const newVisualizationState = activeVisualization.setDimension({
            layerId,
            groupId: activeGroup.groupId,
            columnId: activeId,
            prevState: visualizationState,
            frame: framePublicAPI,
          });
          setActiveDimension({ ...activeDimension, isNew: false });
          updateAll(newState, newVisualizationState);
        } else {
          updateDatasourceState(newState);
        }
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [
        activeDimension,
        activeGroup,
        activeId,
        activeVisualization,
        layerId,
        visualizationState,
        framePublicAPI,
      ]
    );

    const getWrapper = (children: JSX.Element) => {
      if (props.setIsFlyoutVisible) {
        return (
          <EuiFocusTrap
            disabled={false}
            clickOutsideDisables={false}
            onClickOutside={(event) => {
              if (fromExcludedClickTarget(event)) {
                return;
              }
              closeFlyout();
            }}
            onEscapeKey={closeFlyout}
          >
            <EuiFlyout
              type="push"
              ownFocus
              onClose={closeFlyout}
              aria-labelledby={i18n.translate('xpack.lens.config.editLabel', {
                defaultMessage: 'Edit configuration',
              })}
              size="s"
            >
              {children}
            </EuiFlyout>
          </EuiFocusTrap>
        );
      } else {
        return children;
      }
    };

    const content = (
      <>
        {!activeDimension?.activeId && (
          <EuiFlyoutHeader hasBorder className="lnsDimensionContainer__header">
            <EuiTitle size="xs">
              <h2 id="Edit Lens configuration">
                {i18n.translate('xpack.lens.config.editLabel', {
                  defaultMessage: 'Edit configuration',
                })}
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
        )}
        <EuiFlyoutBody>
          <section tabIndex={-1} className="lnsLayerPanel">
            {activeVisualization && activeVisualization.renderToolbar && (
              <NativeRenderer
                render={activeVisualization.renderToolbar}
                nativeProps={{
                  frame: framePublicAPI,
                  state: visualizationState,
                  setState: (payload) => {
                    updateVisualizationState(payload);
                    setActiveDimension(initialActiveDimensionState);
                  },
                }}
              />
            )}
            <EuiSpacer size="m" />
            <EuiPanel data-test-subj={`lns-layerPanel-0`} paddingSize="none">
              <header className="lnsLayerPanel__layerHeader">
                <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
                  <EuiFlexItem grow className="lnsLayerPanel__layerSettingsWrapper">
                    <LayerSettings
                      layerConfigProps={{
                        ...layerVisualizationConfigProps,
                        setState: updateVisualizationState,
                        onChangeIndexPattern: (indexPatternId) => {},
                      }}
                      activeVisualization={activeVisualization}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </header>
              {groups.map((group, groupIndex) => {
                let errorText: string = '';
                if (!isEmptyLayer) {
                  if (
                    group.requiredMinDimensionCount &&
                    group.requiredMinDimensionCount > group.accessors.length
                  ) {
                    if (group.requiredMinDimensionCount > 1) {
                      errorText = i18n.translate(
                        'xpack.lens.editorFrame.requiresTwoOrMoreFieldsWarningLabel',
                        {
                          defaultMessage: 'Requires {requiredMinDimensionCount} fields',
                          values: {
                            requiredMinDimensionCount: group.requiredMinDimensionCount,
                          },
                        }
                      );
                    } else {
                      errorText = i18n.translate(
                        'xpack.lens.editorFrame.requiresFieldWarningLabel',
                        {
                          defaultMessage: 'Requires field',
                        }
                      );
                    }
                  } else if (group.dimensionsTooMany && group.dimensionsTooMany > 0) {
                    errorText = i18n.translate(
                      'xpack.lens.editorFrame.tooManyDimensionsSingularWarningLabel',
                      {
                        defaultMessage:
                          'Please remove {dimensionsTooMany, plural, one {a dimension} other {{dimensionsTooMany} dimensions}}',
                        values: {
                          dimensionsTooMany: group.dimensionsTooMany,
                        },
                      }
                    );
                  }
                }
                const isOptional = !group.requiredMinDimensionCount && !group.suggestedValue;
                return (
                  <EuiFormRow
                    className="lnsLayerPanel__row"
                    fullWidth
                    label={
                      <>
                        {group.groupLabel}
                        {group.groupTooltip && (
                          <>
                            <EuiIconTip
                              color="subdued"
                              content={group.groupTooltip}
                              iconProps={{
                                className: 'eui-alignTop',
                              }}
                              position="top"
                              size="s"
                              type="questionInCircle"
                            />
                          </>
                        )}
                      </>
                    }
                    labelAppend={
                      isOptional ? (
                        <EuiText color="subdued" size="xs" data-test-subj="lnsGroup_optional">
                          {i18n.translate('xpack.lens.editorFrame.optionalDimensionLabel', {
                            defaultMessage: 'Optional',
                          })}
                        </EuiText>
                      ) : null
                    }
                    labelType="legend"
                    key={group.groupId}
                    isInvalid={Boolean(errorText)}
                    error={errorText}
                  >
                    <>
                      {group.accessors.length ? (
                        <>
                          {group.accessors.map((accessorConfig, accessorIndex) => {
                            const { columnId } = accessorConfig;

                            return (
                              <DimensionButton
                                className="lnsLayerPanel__dimension"
                                accessorConfig={accessorConfig}
                                label={columnLabelMap?.[accessorConfig.columnId] ?? ''}
                                groupLabel={group.groupLabel}
                                key={accessorConfig.columnId}
                                onClick={(id: string) => {
                                  setActiveDimension({
                                    isNew: false,
                                    activeGroup: group,
                                    activeId: id,
                                  });
                                }}
                                onRemoveClick={(id: string) => {
                                  removeDimension({ columnId: id, layerId });
                                }}
                                message={undefined}
                              >
                                {layerDatasource ? (
                                  <NativeRenderer
                                    render={layerDatasource.renderDimensionTrigger}
                                    nativeProps={{
                                      ...layerDatasourceConfigProps,
                                      columnId: accessorConfig.columnId,
                                      groupId: group.groupId,
                                      filterOperations: group.filterOperations,
                                      indexPatterns: dataViews.indexPatterns,
                                    }}
                                  />
                                ) : (
                                  <>
                                    {activeVisualization?.renderDimensionTrigger?.({
                                      columnId,
                                      label: columnLabelMap?.[columnId] ?? '',
                                      hideTooltip: true,
                                    })}
                                  </>
                                )}
                              </DimensionButton>
                            );
                          })}
                        </>
                      ) : null}
                      {group.supportsMoreColumns ? (
                        <EmptyDimensionButton
                          activeVisualization={activeVisualization}
                          order={[2, 0, groupIndex, group.accessors.length]}
                          group={group}
                          target={{
                            layerId,
                            groupId: group.groupId,
                            filterOperations: group.filterOperations,
                            prioritizedOperation: group.prioritizedOperation,
                            isNewColumn: true,
                            isMetricDimension: group?.isMetricDimension,
                            indexPatternId: layerDatasource
                              ? layerDatasource.getUsedDataView(layerDatasourceState, layerId)
                              : activeVisualization.getUsedDataView?.(visualizationState, layerId),
                            humanData: {
                              groupLabel: group.groupLabel,
                              layerNumber: 1,
                              position: group.accessors.length + 1,
                              label: i18n.translate(
                                'xpack.lens.indexPattern.emptyDimensionButton',
                                {
                                  defaultMessage: 'Empty dimension',
                                }
                              ),
                            },
                          }}
                          layerDatasource={layerDatasource}
                          state={layerDatasourceState}
                          datasourceLayers={framePublicAPI.datasourceLayers}
                          onClick={(id) => {
                            setActiveDimension({
                              activeGroup: group,
                              activeId: id,
                              isNew: !group.supportStaticValue && Boolean(layerDatasource),
                            });
                          }}
                          indexPatterns={dataViews.indexPatterns}
                          onDrop={() => {}}
                        />
                      ) : null}
                      <DimensionContainer
                        panelRef={(el) => (panelRef.current = el)}
                        enableBackButton={true}
                        isOpen={isDimensionPanelOpen}
                        isFullscreen={false}
                        groupLabel={
                          activeGroup?.dimensionEditorGroupLabel ?? (activeGroup?.groupLabel || '')
                        }
                        handleClose={() => {
                          if (layerDatasource) {
                            if (
                              layerDatasource.canCloseDimensionEditor &&
                              !layerDatasource.canCloseDimensionEditor(layerDatasourceState)
                            ) {
                              return false;
                            }
                            if (layerDatasource.updateStateOnCloseDimension) {
                              const newState = layerDatasource.updateStateOnCloseDimension({
                                state: layerDatasourceState,
                                layerId,
                                columnId: activeId!,
                              });
                              if (newState) {
                                updateDatasourceState(newState);
                              }
                            }
                          }

                          setActiveDimension(initialActiveDimensionState);
                          return true;
                        }}
                        panel={
                          <>
                            {activeGroup && activeId && layerDatasource && (
                              <NativeRenderer
                                render={layerDatasource.renderDimensionEditor}
                                nativeProps={{
                                  ...layerDatasourceConfigProps,
                                  core: coreStart,
                                  columnId: activeId,
                                  groupId: activeGroup.groupId,
                                  hideGrouping: activeGroup.hideGrouping,
                                  filterOperations: activeGroup.filterOperations,
                                  isMetricDimension: activeGroup?.isMetricDimension,
                                  dimensionGroups: groups,
                                  toggleFullscreen: () => {},
                                  isFullscreen: false,
                                  setState: updateDataLayerState,
                                  supportStaticValue: Boolean(activeGroup.supportStaticValue),
                                  paramEditorCustomProps: activeGroup.paramEditorCustomProps,
                                  enableFormatSelector: activeGroup.enableFormatSelector !== false,
                                  formatSelectorOptions: activeGroup.formatSelectorOptions,
                                  layerType: activeVisualization.getLayerType(
                                    layerId,
                                    visualizationState
                                  ),
                                  indexPatterns: dataViews.indexPatterns,
                                  activeData: {},
                                  dataSectionExtra: !activeDimension.isNew &&
                                    activeVisualization.renderDimensionEditorDataExtra && (
                                      <NativeRenderer
                                        render={activeVisualization.renderDimensionEditorDataExtra}
                                        nativeProps={{
                                          ...layerVisualizationConfigProps,
                                          groupId: activeGroup.groupId,
                                          accessor: activeId,
                                          datasource,
                                          setState: (state: unknown) => {
                                            updateVisualizationState(state);
                                          },
                                          addLayer: () => {},
                                          removeLayer: () => {},
                                          panelRef,
                                        }}
                                      />
                                    ),
                                }}
                              />
                            )}
                            {activeGroup &&
                              activeId &&
                              !activeDimension.isNew &&
                              activeVisualization.renderDimensionEditor &&
                              activeGroup?.enableDimensionEditor && (
                                <>
                                  <div className="lnsLayerPanel__styleEditor">
                                    <NativeRenderer
                                      render={activeVisualization.renderDimensionEditor}
                                      nativeProps={{
                                        ...layerVisualizationConfigProps,
                                        groupId: activeGroup.groupId,
                                        accessor: activeId,
                                        datasource,
                                        setState: (state: unknown) => {
                                          updateVisualizationState(state);
                                        },
                                        addLayer: () => {},
                                        removeLayer: () => {},
                                        panelRef,
                                      }}
                                    />
                                  </div>
                                  {activeVisualization.renderDimensionEditorAdditionalSection && (
                                    <NativeRenderer
                                      render={
                                        activeVisualization.renderDimensionEditorAdditionalSection
                                      }
                                      nativeProps={{
                                        ...layerVisualizationConfigProps,
                                        groupId: activeGroup.groupId,
                                        accessor: activeId,
                                        datasource,
                                        setState: (state: unknown) => {
                                          updateVisualizationState(state);
                                        },
                                        addLayer: () => {},
                                        removeLayer: () => {},
                                        panelRef,
                                      }}
                                    />
                                  )}
                                </>
                              )}
                          </>
                        }
                      />
                    </>
                  </EuiFormRow>
                );
              })}
            </EuiPanel>
          </section>
        </EuiFlyoutBody>
      </>
    );

    return getWrapper(content);
  };
}
