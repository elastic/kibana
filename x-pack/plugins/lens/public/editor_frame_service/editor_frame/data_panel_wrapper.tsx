/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './data_panel_wrapper.scss';

import React, { useMemo, memo, useContext, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiPopover, EuiButtonIcon, EuiContextMenuPanel, EuiContextMenuItem } from '@elastic/eui';
import { NativeRenderer } from '../../native_renderer';
import { DragContext, DragDropIdentifier } from '../../drag_drop';
import { StateSetter, FramePublicAPI, DatasourceDataPanelProps, Datasource } from '../../types';
import { Query, Filter } from '../../../../../../src/plugins/data/public';
import { UiActionsStart } from '../../../../../../src/plugins/ui_actions/public';
import {
  switchDatasource,
  useLensDispatch,
  updateDatasourceState,
  LensState,
  useLensSelector,
} from '../../state_management';
import { createSelector } from '@reduxjs/toolkit';

interface DataPanelWrapperProps {
  datasourceState: unknown;
  datasourceMap: Record<string, Datasource>;
  activeDatasource: string | null;
  datasourceIsLoading: boolean;
  showNoDataPopover: () => void;
  core: DatasourceDataPanelProps['core'];
  dropOntoWorkspace: (field: DragDropIdentifier) => void;
  hasSuggestionForField: (field: DragDropIdentifier) => boolean;
  plugins: { uiActions: UiActionsStart };
}

const getExternals = createSelector(
  (state: LensState) => state.app,
  ({ resolvedDateRange, query, filters }) => ({
    dateRange: resolvedDateRange,
    query,
    filters,
  })
);

export const DataPanelWrapper = memo((props: DataPanelWrapperProps) => {
  const { activeDatasource } = props;

  const { filters, query, dateRange } = useLensSelector(getExternals);
  const dispatchLens = useLensDispatch();
  const setDatasourceState: StateSetter<unknown> = useMemo(() => {
    return (updater) => {
      dispatchLens(
        updateDatasourceState({
          updater,
          datasourceId: activeDatasource!,
          clearStagedPreview: true,
        })
      );
    };
  }, [activeDatasource, dispatchLens]);

  const datasourceProps: DatasourceDataPanelProps = {
    dragDropContext: useContext(DragContext),
    state: props.datasourceState,
    setState: setDatasourceState,
    core: props.core,
    filters,
    query,
    dateRange,
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
                icon={props.activeDatasource === datasourceId ? 'check' : 'empty'}
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
      {props.activeDatasource && !props.datasourceIsLoading && (
        <NativeRenderer
          className="lnsDataPanelWrapper"
          render={props.datasourceMap[props.activeDatasource].renderDataPanel}
          nativeProps={datasourceProps}
        />
      )}
    </>
  );
});
