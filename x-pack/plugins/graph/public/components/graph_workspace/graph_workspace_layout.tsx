/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n/react';
import { Provider } from 'react-redux';
import { SearchBar } from '../search_bar';
import { FieldManager } from '../field_manager';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';
import { IndexPattern } from '../../../../../../src/plugins/data/public';
import {
  GraphWorkspaceSavedObject,
  IndexPatternProvider,
  IndexPatternSavedObject,
} from '../../types';
import { GraphDependencies } from '../../application';
import { GraphTopNavMenu, MenuOptions } from './graph_top_nav_menu';
import { useGraphState } from './use_graph_state';
import { InspectPanel } from '../inspect_panel';
import { GuidancePanel } from '../guidance_panel';
import { GraphTitle } from '../graph_title';
import { GraphView } from './graph_view';

interface GraphWorkspaceProps {
  indexPatternProvider: IndexPatternProvider;
  indexPatterns: IndexPatternSavedObject[];
  savedWorkspace: GraphWorkspaceSavedObject;
  workspaceId: string;
  query: string;
  deps: GraphDependencies;
  location: angular.ILocationService;
}

const SearchBarMemoized = memo(SearchBar);
const FieldManagerMemoized = memo(FieldManager);
const GuidancePanelMemoized = memo(GuidancePanel);
const InspectPanelMemoized = memo(InspectPanel);

export const GraphWorkspaceLayout = (props: GraphWorkspaceProps) => {
  const {
    store,
    loading,
    workspace,
    workspaceInitialized,
    initialQuery,
    urlTemplates,
    noIndexPatterns,
    liveResponseFields,
    submit,
    canWipeWorkspace,
  } = useGraphState(props);
  const [menus, setMenus] = useState<MenuOptions>({
    showSettings: false,
    showInspect: false,
  });
  const [currentIndexPattern, setCurrentIndexPattern] = useState<IndexPattern>();
  const [pickerOpen, setPickerOpen] = useState(false);
  const isInitialized = Boolean(workspaceInitialized || props.savedWorkspace.id);

  const services = useMemo(
    () => ({
      appName: 'graph',
      storage: props.deps.storage,
      data: props.deps.data,
      ...props.deps.coreStart,
    }),
    [props.deps.coreStart, props.deps.data, props.deps.storage]
  );

  const onIndexPatternChange = useCallback(
    (indexPattern?: IndexPattern) => setCurrentIndexPattern(indexPattern),
    []
  );

  const onOpenFieldPicker = useCallback(() => {
    setPickerOpen(true);
  }, []);

  return (
    <I18nProvider>
      <KibanaContextProvider services={services}>
        <Provider store={store}>
          <GraphTopNavMenu
            deps={props.deps}
            store={store}
            location={props.location}
            workspace={workspace}
            savedWorkspace={props.savedWorkspace}
            onSetMenus={setMenus}
            canWipeWorkspace={canWipeWorkspace}
          />

          <InspectPanelMemoized
            showInspect={menus.showInspect}
            lastRequest={workspace?.lastRequest}
            lastResponse={workspace?.lastResponse}
            indexPattern={currentIndexPattern}
          />

          {isInitialized && <GraphTitle />}
          <div className="gphGraph__bar">
            <SearchBarMemoized
              isLoading={loading}
              initialQuery={initialQuery}
              currentIndexPattern={currentIndexPattern}
              indexPatternProvider={props.indexPatternProvider}
              onQuerySubmit={submit}
              confirmWipeWorkspace={canWipeWorkspace}
              onIndexPatternChange={onIndexPatternChange}
            />
            <EuiSpacer size="s" />
            <FieldManagerMemoized pickerOpen={pickerOpen} setPickerOpen={setPickerOpen} />
          </div>
          {!isInitialized && (
            <GuidancePanelMemoized
              noIndexPatterns={noIndexPatterns}
              onOpenFieldPicker={onOpenFieldPicker}
            />
          )}

          {isInitialized && workspace && (
            <GraphView
              workspace={workspace}
              urlTemplates={urlTemplates}
              liveResponseFields={liveResponseFields}
            />
          )}
        </Provider>
      </KibanaContextProvider>
    </I18nProvider>
  );
};
