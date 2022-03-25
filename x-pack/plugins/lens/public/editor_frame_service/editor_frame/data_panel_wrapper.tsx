/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './data_panel_wrapper.scss';

import React, { useMemo, memo, useContext, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiPopover, EuiButtonIcon, EuiContextMenuPanel, EuiContextMenuItem } from '@elastic/eui';
import { NativeRenderer } from '../../native_renderer';
import { DragContext, DragDropIdentifier } from '../../drag_drop';
import { StateSetter, DatasourceDataPanelProps, DatasourceMap } from '../../types';
import { UiActionsStart } from '../../../../../../src/plugins/ui_actions/public';
import {
  switchDatasource,
  useLensDispatch,
  updateDatasourceState,
  useLensSelector,
  setState,
  applyChanges,
  selectExecutionContext,
  selectActiveDatasourceId,
  selectDatasourceStates,
} from '../../state_management';
import { initializeDatasources } from './state_helpers';

interface DataPanelWrapperProps {
  datasourceMap: DatasourceMap;
  showNoDataPopover: () => void;
  core: DatasourceDataPanelProps['core'];
  dropOntoWorkspace: (field: DragDropIdentifier) => void;
  hasSuggestionForField: (field: DragDropIdentifier) => boolean;
  plugins: { uiActions: UiActionsStart };
}

export const DataPanelWrapper = memo((props: DataPanelWrapperProps) => {
  const externalContext = useLensSelector(selectExecutionContext);
  const activeDatasourceId = useLensSelector(selectActiveDatasourceId);
  const datasourceStates = useLensSelector(selectDatasourceStates);

  const datasourceIsLoading = activeDatasourceId
    ? datasourceStates[activeDatasourceId].isLoading
    : true;

  const dispatchLens = useLensDispatch();
  const setDatasourceState: StateSetter<unknown, { applyImmediately?: boolean }> = useMemo(() => {
    return (updater: unknown | ((prevState: unknown) => unknown), options) => {
      dispatchLens(
        updateDatasourceState({
          updater,
          datasourceId: activeDatasourceId!,
          clearStagedPreview: true,
        })
      );
      if (options?.applyImmediately) {
        dispatchLens(applyChanges());
      }
    };
  }, [activeDatasourceId, dispatchLens]);

  useEffect(() => {
    if (activeDatasourceId && datasourceStates[activeDatasourceId].state === null) {
      initializeDatasources(props.datasourceMap, datasourceStates, undefined, undefined, {
        isFullEditor: true,
      }).then((result) => {
        const newDatasourceStates = Object.entries(result).reduce(
          (state, [datasourceId, datasourceState]) => ({
            ...state,
            [datasourceId]: {
              ...datasourceState,
              isLoading: false,
            },
          }),
          {}
        );
        dispatchLens(setState({ datasourceStates: newDatasourceStates }));
      });
    }
  }, [datasourceStates, activeDatasourceId, props.datasourceMap, dispatchLens]);

  const datasourceProps: DatasourceDataPanelProps = {
    ...externalContext,
    dragDropContext: useContext(DragContext),
    state: activeDatasourceId ? datasourceStates[activeDatasourceId].state : null,
    setState: setDatasourceState,
    core: props.core,
    showNoDataPopover: props.showNoDataPopover,
    dropOntoWorkspace: props.dropOntoWorkspace,
    hasSuggestionForField: props.hasSuggestionForField,
    uiActions: props.plugins.uiActions,
  };

  const [showDatasourceSwitcher, setDatasourceSwitcher] = useState(false);

  return (
    <>
      {Object.keys(props.datasourceMap).length > 1 && (
        <EuiPopover
          id="datasource-switch"
          className="lnsDataPanelWrapper__switchSource"
          button={
            <EuiButtonIcon
              aria-label={i18n.translate('xpack.lens.dataPanelWrapper.switchDatasource', {
                defaultMessage: 'Switch to datasource',
              })}
              title={i18n.translate('xpack.lens.dataPanelWrapper.switchDatasource', {
                defaultMessage: 'Switch to datasource',
              })}
              data-test-subj="datasource-switch"
              onClick={() => setDatasourceSwitcher(true)}
              iconType="gear"
            />
          }
          isOpen={showDatasourceSwitcher}
          closePopover={() => setDatasourceSwitcher(false)}
          panelPaddingSize="none"
          anchorPosition="rightUp"
        >
          <EuiContextMenuPanel
            title={i18n.translate('xpack.lens.dataPanelWrapper.switchDatasource', {
              defaultMessage: 'Switch to datasource',
            })}
            items={Object.keys(props.datasourceMap).map((datasourceId) => (
              <EuiContextMenuItem
                key={datasourceId}
                data-test-subj={`datasource-switch-${datasourceId}`}
                icon={activeDatasourceId === datasourceId ? 'check' : 'empty'}
                onClick={() => {
                  setDatasourceSwitcher(false);
                  dispatchLens(switchDatasource({ newDatasourceId: datasourceId }));
                }}
              >
                {datasourceId}
              </EuiContextMenuItem>
            ))}
          />
        </EuiPopover>
      )}
      {activeDatasourceId && !datasourceIsLoading && (
        <NativeRenderer
          className="lnsDataPanelWrapper"
          render={props.datasourceMap[activeDatasourceId].renderDataPanel}
          nativeProps={datasourceProps}
        />
      )}
    </>
  );
});
