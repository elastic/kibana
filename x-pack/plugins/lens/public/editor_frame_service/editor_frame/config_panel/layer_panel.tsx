/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './layer_panel.scss';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  EuiPanel,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { NativeRenderer } from '../../../native_renderer';
import { StateSetter, Visualization, DraggedOperation, DropType } from '../../../types';
import { DragDropIdentifier, ReorderProvider } from '../../../drag_drop';
import { LayerSettings } from './layer_settings';
import { trackUiEvent } from '../../../lens_ui_telemetry';
import { LayerPanelProps, ActiveDimensionState } from './types';
import { DimensionContainer } from './dimension_container';
import { RemoveLayerButton } from './remove_layer_button';
import { EmptyDimensionButton } from './buttons/empty_dimension_button';
import { DimensionButton } from './buttons/dimension_button';
import { DraggableDimensionButton } from './buttons/draggable_dimension_button';
import { useFocusUpdate } from './use_focus_update';

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
    updateDatasourceAsync: (datasourceId: string, newState: unknown) => void;
    updateAll: (
      datasourceId: string,
      newDatasourcestate: unknown,
      newVisualizationState: unknown
    ) => void;
    onRemoveLayer: () => void;
    registerNewLayerRef: (layerId: string, instance: HTMLDivElement | null) => void;
    toggleFullscreen: () => void;
    isFullscreen: boolean;
  }
) {
  const [activeDimension, setActiveDimension] = useState<ActiveDimensionState>(
    initialActiveDimensionState
  );

  const {
    framePublicAPI,
    layerId,
    isOnlyLayer,
    onRemoveLayer,
    registerNewLayerRef,
    layerIndex,
    activeVisualization,
    updateVisualization,
    updateDatasource,
    toggleFullscreen,
    isFullscreen,
  } = props;
  const datasourcePublicAPI = framePublicAPI.datasourceLayers[layerId];

  useEffect(() => {
    setActiveDimension(initialActiveDimensionState);
  }, [activeVisualization.id]);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const registerLayerRef = useCallback((el) => registerNewLayerRef(layerId, el), [
    layerId,
    registerNewLayerRef,
  ]);

  const layerVisualizationConfigProps = {
    layerId,
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
      state: layerDatasourceState,
      setState: (newState: unknown) => {
        updateDatasource(datasourceId, newState);
      },
    }),
    [layerId, layerDatasourceState, datasourceId, updateDatasource]
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

  const allAccessors = groups.flatMap((group) =>
    group.accessors.map((accessor) => accessor.columnId)
  );

  const {
    setNextFocusedId: setNextFocusedButtonId,
    removeRef: removeButtonRef,
    registerNewRef: registerNewButtonRef,
  } = useFocusUpdate(allAccessors);

  const layerDatasourceOnDrop = layerDatasource.onDrop;

  const onDrop = useMemo(() => {
    return (
      droppedItem: DragDropIdentifier,
      targetItem: DragDropIdentifier,
      dropType?: DropType
    ) => {
      if (!dropType) {
        return;
      }
      const {
        columnId,
        groupId,
        layerId: targetLayerId,
      } = (targetItem as unknown) as DraggedOperation;
      if (dropType === 'reorder' || dropType === 'field_replace' || dropType === 'field_add') {
        setNextFocusedButtonId(droppedItem.id);
      } else {
        setNextFocusedButtonId(columnId);
      }

      const filterOperations =
        groups.find(({ groupId: gId }) => gId === targetItem.groupId)?.filterOperations ||
        (() => false);

      const dropResult = layerDatasourceOnDrop({
        ...layerDatasourceDropProps,
        droppedItem,
        columnId,
        layerId: targetLayerId,
        filterOperations,
        dimensionGroups: groups,
        groupId,
        dropType,
      });
      if (dropResult) {
        const newVisState = setDimension({
          columnId,
          groupId,
          layerId: targetLayerId,
          prevState: props.visualizationState,
          previousColumn: typeof droppedItem.column === 'string' ? droppedItem.column : undefined,
        });

        if (typeof dropResult === 'object') {
          // When a column is moved, we delete the reference to the old
          updateVisualization(
            removeDimension({
              columnId: dropResult.deleted,
              layerId: targetLayerId,
              prevState: newVisState,
            })
          );
        } else {
          updateVisualization(newVisState);
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
    setNextFocusedButtonId,
  ]);

  const isDimensionPanelOpen = Boolean(activeId);

  return (
    <>
      <section
        tabIndex={-1}
        ref={registerLayerRef}
        className="lnsLayerPanel"
        style={{ visibility: isDimensionPanelOpen ? 'hidden' : 'visible' }}
      >
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
                label={
                  <div className="lnsLayerPanel__groupLabel">
                    {group.groupLabel}
                    {group.groupTooltip && (
                      <>
                        {' '}
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
                  </div>
                }
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
                          registerNewButtonRef={registerNewButtonRef}
                          accessorIndex={accessorIndex}
                          columnId={columnId}
                          group={group}
                          groups={groups}
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
                                removeButtonRef(id);
                              }}
                            >
                              <NativeRenderer
                                render={layerDatasource.renderDimensionTrigger}
                                nativeProps={{
                                  ...layerDatasourceConfigProps,
                                  columnId: accessorConfig.columnId,
                                  groupId: group.groupId,
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
                      group={group}
                      groupIndex={groupIndex}
                      groups={groups}
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

          <EuiSpacer size="m" />

          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false}>
              <RemoveLayerButton
                onRemoveLayer={onRemoveLayer}
                layerIndex={layerIndex}
                isOnlyLayer={isOnlyLayer}
                activeVisualization={activeVisualization}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </section>

      <DimensionContainer
        panelRef={(el) => (panelRef.current = el)}
        isOpen={isDimensionPanelOpen}
        isFullscreen={isFullscreen}
        groupLabel={activeGroup?.groupLabel || ''}
        handleClose={() => {
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
              props.updateDatasource(datasourceId, newState);
            }
          }
          setActiveDimension(initialActiveDimensionState);
          if (isFullscreen) {
            toggleFullscreen();
          }
          return true;
        }}
        panel={
          <div>
            {activeGroup && activeId && (
              <NativeRenderer
                render={layerDatasource.renderDimensionEditor}
                nativeProps={{
                  ...layerDatasourceConfigProps,
                  core: props.core,
                  columnId: activeId,
                  groupId: activeGroup.groupId,
                  hideGrouping: activeGroup.hideGrouping,
                  filterOperations: activeGroup.filterOperations,
                  dimensionGroups: groups,
                  toggleFullscreen,
                  isFullscreen,
                  setState: (
                    newState: unknown,
                    { isDimensionComplete = true }: { isDimensionComplete?: boolean } = {}
                  ) => {
                    if (allAccessors.includes(activeId)) {
                      if (isDimensionComplete) {
                        props.updateDatasourceAsync(datasourceId, newState);
                      } else {
                        // The datasource can indicate that the previously-valid column is no longer
                        // complete, which clears the visualization. This keeps the flyout open and reuses
                        // the previous columnId
                        props.updateAll(
                          datasourceId,
                          newState,
                          activeVisualization.removeDimension({
                            layerId,
                            columnId: activeId,
                            prevState: props.visualizationState,
                          })
                        );
                      }
                    } else if (isDimensionComplete) {
                      props.updateAll(
                        datasourceId,
                        newState,
                        activeVisualization.setDimension({
                          layerId,
                          groupId: activeGroup.groupId,
                          columnId: activeId,
                          prevState: props.visualizationState,
                        })
                      );
                      setActiveDimension({ ...activeDimension, isNew: false });
                    } else {
                      props.updateDatasourceAsync(datasourceId, newState);
                    }
                  },
                }}
              />
            )}
            {activeGroup &&
              activeId &&
              !isFullscreen &&
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
                      panelRef,
                    }}
                  />
                </div>
              )}
          </div>
        }
      />
    </>
  );
}
