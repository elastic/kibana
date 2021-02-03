/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import './layer_panel.scss';

import React, { useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { EuiPanel, EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { NativeRenderer } from '../../../native_renderer';
import { StateSetter, Visualization } from '../../../types';
import {
  DragContext,
  DragDropIdentifier,
  ChildDragDropProvider,
  ReorderProvider,
} from '../../../drag_drop';
import { LayerSettings } from './layer_settings';
import { trackUiEvent } from '../../../lens_ui_telemetry';
import { LayerPanelProps, ActiveDimensionState } from './types';
import { DimensionContainer } from './dimension_container';
import { RemoveLayerButton } from './remove_layer_button';
import { EmptyDimensionButton } from './empty_dimension_button';
import { DimensionButton } from './dimension_button';
import { DraggableDimensionButton } from './draggable_dimension_button';

const initialActiveDimensionState = {
  isNew: false,
};

export function LayerPanel(
  props: Exclude<LayerPanelProps, 'state' | 'setState'> & {
    activeVisualization: Visualization;
    layerId: string;
    layerIndex: number;
    isOnlyLayer: boolean;
    updateVisualization: StateSetter<unknown>;
    updateDatasource: (datasourceId: string, newState: unknown) => void;
    updateAll: (
      datasourceId: string,
      newDatasourcestate: unknown,
      newVisualizationState: unknown
    ) => void;
    onRemoveLayer: () => void;
    setLayerRef: (layerId: string, instance: HTMLDivElement | null) => void;
  }
) {
  const dragDropContext = useContext(DragContext);
  const [activeDimension, setActiveDimension] = useState<ActiveDimensionState>(
    initialActiveDimensionState
  );

  const {
    framePublicAPI,
    layerId,
    isOnlyLayer,
    onRemoveLayer,
    setLayerRef,
    layerIndex,
    activeVisualization,
    updateVisualization,
    updateDatasource,
  } = props;
  const datasourcePublicAPI = framePublicAPI.datasourceLayers[layerId];

  useEffect(() => {
    setActiveDimension(initialActiveDimensionState);
  }, [activeVisualization.id]);

  const setLayerRefMemoized = useCallback((el) => setLayerRef(layerId, el), [layerId, setLayerRef]);

  const layerVisualizationConfigProps = {
    layerId,
    dragDropContext,
    state: props.visualizationState,
    frame: props.framePublicAPI,
    dateRange: props.framePublicAPI.dateRange,
    activeData: props.framePublicAPI.activeData,
  };

  const datasourceId = datasourcePublicAPI.datasourceId;
  const layerDatasourceState = props.datasourceStates[datasourceId].state;

  const layerDatasourceDropProps = useMemo(
    () => ({
      layerId,
      dragDropContext,
      state: layerDatasourceState,
      setState: (newState: unknown) => {
        updateDatasource(datasourceId, newState);
      },
    }),
    [layerId, dragDropContext, layerDatasourceState, datasourceId, updateDatasource]
  );

  const layerDatasource = props.datasourceMap[datasourceId];

  const layerDatasourceConfigProps = {
    ...layerDatasourceDropProps,
    frame: props.framePublicAPI,
    dateRange: props.framePublicAPI.dateRange,
    activeData: props.framePublicAPI.activeData,
  };

  const { groups } = activeVisualization.getConfiguration(layerVisualizationConfigProps);
  const isEmptyLayer = !groups.some((d) => d.accessors.length > 0);
  const { activeId, activeGroup } = activeDimension;

  const columnLabelMap = layerDatasource.uniqueLabels(layerDatasourceConfigProps.state);

  const { setDimension, removeDimension } = activeVisualization;
  const layerDatasourceOnDrop = layerDatasource.onDrop;

  const onDrop = useMemo(() => {
    return (droppedItem: DragDropIdentifier, targetItem: DragDropIdentifier) => {
      const { columnId, groupId, layerId: targetLayerId, isNew } = (targetItem as unknown) as {
        groupId: string;
        columnId: string;
        layerId: string;
        isNew?: boolean;
      };

      const filterOperations =
        groups.find(({ groupId: gId }) => gId === targetItem.groupId)?.filterOperations ||
        (() => false);

      const dropResult = layerDatasourceOnDrop({
        ...layerDatasourceDropProps,
        droppedItem,
        columnId,
        groupId,
        layerId: targetLayerId,
        isNew,
        filterOperations,
      });
      if (dropResult) {
        updateVisualization(
          setDimension({
            columnId,
            groupId,
            layerId: targetLayerId,
            prevState: props.visualizationState,
          })
        );

        if (typeof dropResult === 'object') {
          // When a column is moved, we delete the reference to the old
          updateVisualization(
            removeDimension({
              columnId: dropResult.deleted,
              layerId: targetLayerId,
              prevState: props.visualizationState,
            })
          );
        }
      }
    };
  }, [
    groups,
    layerDatasourceOnDrop,
    props.visualizationState,
    updateVisualization,
    setDimension,
    removeDimension,
    layerDatasourceDropProps,
  ]);

  return (
    <ChildDragDropProvider {...dragDropContext}>
      <section tabIndex={-1} ref={setLayerRefMemoized} className="lnsLayerPanel">
        <EuiPanel data-test-subj={`lns-layerPanel-${layerIndex}`} paddingSize="s">
          <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
            <EuiFlexItem grow={false} className="lnsLayerPanel__settingsFlexItem">
              <LayerSettings
                layerId={layerId}
                layerConfigProps={{
                  ...layerVisualizationConfigProps,
                  setState: props.updateVisualization,
                }}
                activeVisualization={activeVisualization}
              />
            </EuiFlexItem>

            {layerDatasource && (
              <EuiFlexItem className="lnsLayerPanel__sourceFlexItem">
                <NativeRenderer
                  render={layerDatasource.renderLayerPanel}
                  nativeProps={{
                    layerId,
                    state: layerDatasourceState,
                    activeData: props.framePublicAPI.activeData,
                    setState: (updater: unknown) => {
                      const newState =
                        typeof updater === 'function' ? updater(layerDatasourceState) : updater;
                      // Look for removed columns
                      const nextPublicAPI = layerDatasource.getPublicAPI({
                        state: newState,
                        layerId,
                      });
                      const nextTable = new Set(
                        nextPublicAPI.getTableSpec().map(({ columnId }) => columnId)
                      );
                      const removed = datasourcePublicAPI
                        .getTableSpec()
                        .map(({ columnId }) => columnId)
                        .filter((columnId) => !nextTable.has(columnId));
                      let nextVisState = props.visualizationState;
                      removed.forEach((columnId) => {
                        nextVisState = activeVisualization.removeDimension({
                          layerId,
                          columnId,
                          prevState: nextVisState,
                        });
                      });

                      props.updateAll(datasourceId, newState, nextVisState);
                    },
                  }}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>

          <EuiSpacer size="m" />

          {groups.map((group, groupIndex) => {
            const isMissing = !isEmptyLayer && group.required && group.accessors.length === 0;
            return (
              <EuiFormRow
                className={
                  group.supportsMoreColumns
                    ? 'lnsLayerPanel__row'
                    : 'lnsLayerPanel__row lnsLayerPanel__row--notSupportsMoreColumns'
                }
                fullWidth
                label={<div className="lnsLayerPanel__groupLabel">{group.groupLabel}</div>}
                labelType="legend"
                key={group.groupId}
                isInvalid={isMissing}
                error={
                  isMissing ? (
                    <div className="lnsLayerPanel__error">
                      {i18n.translate('xpack.lens.editorFrame.requiredDimensionWarningLabel', {
                        defaultMessage: 'Required dimension',
                      })}
                    </div>
                  ) : (
                    []
                  )
                }
              >
                <>
                  <ReorderProvider id={group.groupId} className={'lnsLayerPanel__group'}>
                    {group.accessors.map((accessorConfig, accessorIndex) => {
                      const { columnId } = accessorConfig;

                      return (
                        <DraggableDimensionButton
                          accessorIndex={accessorIndex}
                          columnId={columnId}
                          dragDropContext={dragDropContext}
                          group={group}
                          groupIndex={groupIndex}
                          key={columnId}
                          layerDatasourceDropProps={layerDatasourceDropProps}
                          label={columnLabelMap[columnId]}
                          layerDatasource={layerDatasource}
                          layerIndex={layerIndex}
                          layerId={layerId}
                          onDrop={onDrop}
                        >
                          <div className="lnsLayerPanel__dimension">
                            <DimensionButton
                              accessorConfig={accessorConfig}
                              label={columnLabelMap[accessorConfig.columnId]}
                              group={group}
                              onClick={(id: string) => {
                                setActiveDimension({
                                  isNew: false,
                                  activeGroup: group,
                                  activeId: id,
                                });
                              }}
                              onRemoveClick={(id: string) => {
                                trackUiEvent('indexpattern_dimension_removed');
                                props.updateAll(
                                  datasourceId,
                                  layerDatasource.removeColumn({
                                    layerId,
                                    columnId: id,
                                    prevState: layerDatasourceState,
                                  }),
                                  activeVisualization.removeDimension({
                                    layerId,
                                    columnId: id,
                                    prevState: props.visualizationState,
                                  })
                                );
                              }}
                            >
                              <NativeRenderer
                                render={layerDatasource.renderDimensionTrigger}
                                nativeProps={{
                                  ...layerDatasourceConfigProps,
                                  columnId: accessorConfig.columnId,
                                  filterOperations: group.filterOperations,
                                }}
                              />
                            </DimensionButton>
                          </div>
                        </DraggableDimensionButton>
                      );
                    })}
                  </ReorderProvider>
                  {group.supportsMoreColumns ? (
                    <EmptyDimensionButton
                      dragDropContext={dragDropContext}
                      group={group}
                      groupIndex={groupIndex}
                      layerId={layerId}
                      layerIndex={layerIndex}
                      layerDatasource={layerDatasource}
                      layerDatasourceDropProps={layerDatasourceDropProps}
                      onClick={(id) => {
                        setActiveDimension({
                          activeGroup: group,
                          activeId: id,
                          isNew: true,
                        });
                      }}
                      onDrop={onDrop}
                    />
                  ) : null}
                </>
              </EuiFormRow>
            );
          })}
          <DimensionContainer
            isOpen={!!activeId}
            groupLabel={activeGroup?.groupLabel || ''}
            handleClose={() => {
              if (layerDatasource.updateStateOnCloseDimension) {
                const newState = layerDatasource.updateStateOnCloseDimension({
                  state: layerDatasourceState,
                  layerId,
                  columnId: activeId!,
                });
                if (newState) {
                  props.updateDatasource(datasourceId, newState);
                }
              }
              setActiveDimension(initialActiveDimensionState);
            }}
            panel={
              <>
                {activeGroup && activeId && (
                  <NativeRenderer
                    render={layerDatasource.renderDimensionEditor}
                    nativeProps={{
                      ...layerDatasourceConfigProps,
                      core: props.core,
                      columnId: activeId,
                      filterOperations: activeGroup.filterOperations,
                      dimensionGroups: groups,
                      setState: (
                        newState: unknown,
                        {
                          shouldReplaceDimension,
                          shouldRemoveDimension,
                        }: {
                          shouldReplaceDimension?: boolean;
                          shouldRemoveDimension?: boolean;
                        } = {}
                      ) => {
                        if (shouldReplaceDimension || shouldRemoveDimension) {
                          props.updateAll(
                            datasourceId,
                            newState,
                            shouldRemoveDimension
                              ? activeVisualization.removeDimension({
                                  layerId,
                                  columnId: activeId,
                                  prevState: props.visualizationState,
                                })
                              : activeVisualization.setDimension({
                                  layerId,
                                  groupId: activeGroup.groupId,
                                  columnId: activeId,
                                  prevState: props.visualizationState,
                                })
                          );
                        } else {
                          props.updateDatasource(datasourceId, newState);
                        }
                        setActiveDimension({
                          ...activeDimension,
                          isNew: false,
                        });
                      },
                    }}
                  />
                )}
                {activeGroup &&
                  activeId &&
                  !activeDimension.isNew &&
                  activeVisualization.renderDimensionEditor &&
                  activeGroup?.enableDimensionEditor && (
                    <div className="lnsLayerPanel__styleEditor">
                      <NativeRenderer
                        render={activeVisualization.renderDimensionEditor}
                        nativeProps={{
                          ...layerVisualizationConfigProps,
                          groupId: activeGroup.groupId,
                          accessor: activeId,
                          setState: props.updateVisualization,
                        }}
                      />
                    </div>
                  )}
              </>
            }
          />

          <EuiSpacer size="m" />

          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false}>
              <RemoveLayerButton
                onRemoveLayer={onRemoveLayer}
                layerIndex={layerIndex}
                isOnlyLayer={isOnlyLayer}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </section>
    </ChildDragDropProvider>
  );
}
