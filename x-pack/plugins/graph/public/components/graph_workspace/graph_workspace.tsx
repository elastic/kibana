/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, memo, useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer } from '@elastic/eui';
import { connect } from 'react-redux';
import { SearchBar } from '../search_bar';
import {
  GraphState,
  hasFieldsSelector,
  initializeWorkspace,
  liveResponseFieldsSelector,
  loadSavedWorkspace,
  workspaceInitializedSelector,
} from '../../state_management';
import { FieldManager } from '../field_manager';
import { IndexPattern } from '../../../../../../src/plugins/data/public';
import { IndexPatternProvider, IndexPatternSavedObject, WorkspaceField } from '../../types';
import { GraphTopNavMenu, MenuOptions } from './graph_top_nav_menu';
import { InspectPanel } from '../inspect_panel';
import { GuidancePanel } from '../guidance_panel';
import { GraphTitle } from '../graph_title';
import { GraphView } from './graph_view';
import { GraphWorkspaceSavedObject, Workspace } from '../../types';
import { GraphDependencies } from '../../application';

/**
 * Each component, which depends on `worksapce`
 * should not be memoized, since it will not get updates.
 * This behaviour should be changed after migrating `worksapce` to redux
 */
const SearchBarMemoized = memo(SearchBar);
const FieldManagerMemoized = memo(FieldManager);
const GuidancePanelMemoized = memo(GuidancePanel);

type GraphWorkspaceProps = Pick<
  GraphDependencies,
  | 'setHeaderActionMenu'
  | 'graphSavePolicy'
  | 'navigation'
  | 'capabilities'
  | 'coreStart'
  | 'canEditDrillDownUrls'
  | 'toastNotifications'
  | 'overlays'
> & {
  counter: number;
  workspace?: Workspace;
  loading: boolean;
  locationUrl: (path?: string) => string;
  query: string;
  indexPatterns: IndexPatternSavedObject[];
  savedWorkspace: GraphWorkspaceSavedObject;
  indexPatternProvider: IndexPatternProvider;
};

interface GraphWorkspaceStateProps {
  liveResponseFields: WorkspaceField[];
  workspaceInitialized: boolean;
  hasFields: boolean;
}

interface GraphWorkspaceDispatchProps {
  initializeWorkspace: () => void;
  loadSavedWorkspace: (savedWorkspace: GraphWorkspaceSavedObject) => void;
}

const GraphWorkspaceComponent = ({
  workspace,
  loading,
  locationUrl,
  savedWorkspace,
  liveResponseFields,
  query,
  hasFields,
  overlays,
  workspaceInitialized,
  indexPatterns,
  indexPatternProvider,
  toastNotifications,
  capabilities,
  coreStart,
  graphSavePolicy,
  navigation,
  initializeWorkspace: initializeWorkspaceAction,
  loadSavedWorkspace: loadSavedWorkspaceAction,
  setHeaderActionMenu,
  canEditDrillDownUrls,
}: GraphWorkspaceProps & GraphWorkspaceStateProps & GraphWorkspaceDispatchProps) => {
  const [initialQuery, setInitialQuery] = useState<string>();
  const [currentIndexPattern, setCurrentIndexPattern] = useState<IndexPattern>();
  const [noIndexPatterns, setNoIndexPatterns] = useState<boolean>(false);
  const [menus, setMenus] = useState<MenuOptions>({
    showSettings: false,
    showInspect: false,
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const isInitialized = Boolean(workspaceInitialized || savedWorkspace.id);

  // Deal with situation of request to open saved workspace
  useEffect(() => {
    if (savedWorkspace.id) {
      loadSavedWorkspaceAction(savedWorkspace);
    } else {
      setNoIndexPatterns(indexPatterns.length === 0);
    }
  }, [loadSavedWorkspaceAction, indexPatterns.length, savedWorkspace]);

  const handleError = useCallback(
    (err: Error | string) => {
      const toastTitle = i18n.translate('xpack.graph.errorToastTitle', {
        defaultMessage: 'Graph Error',
        description: '"Graph" is a product name and should not be translated.',
      });
      if (err instanceof Error) {
        toastNotifications.addError(err, {
          title: toastTitle,
        });
      } else {
        toastNotifications.addDanger({
          title: toastTitle,
          text: String(err),
        });
      }
    },
    [toastNotifications]
  );

  const submit = useCallback(
    (searchTerm: string) => {
      initializeWorkspaceAction();
      // type casting is safe, at this point workspace should be loaded
      const numHops = 2;
      const curWorkspace = workspace as Workspace;
      if (searchTerm.startsWith('{')) {
        try {
          const searchQuery = JSON.parse(searchTerm);
          if (searchQuery.vertices) {
            // Is a graph explore request
            curWorkspace.callElasticsearch(query);
          } else {
            // Is a regular query DSL query
            curWorkspace.search(query, liveResponseFields, numHops);
          }
        } catch (err) {
          handleError(err);
        }
        return;
      }
      curWorkspace.simpleSearch(searchTerm, liveResponseFields, numHops);
    },
    [handleError, initializeWorkspaceAction, liveResponseFields, query, workspace]
  );

  // Allow URLs to include a user-defined text query
  useEffect(() => {
    if (query) {
      setInitialQuery(query);
      if (workspace) {
        submit(query);
      }
    }
  }, [query, submit, workspace]);

  const onIndexPatternChange = useCallback(
    (indexPattern?: IndexPattern) => setCurrentIndexPattern(indexPattern),
    []
  );

  const onOpenFieldPicker = useCallback(() => {
    setPickerOpen(true);
  }, []);

  const confirmWipeWorkspace = useCallback(
    (
      onConfirm: () => void,
      text?: string,
      options?: { confirmButtonText: string; title: string }
    ) => {
      if (!hasFields) {
        onConfirm();
        return;
      }
      const confirmModalOptions = {
        confirmButtonText: i18n.translate('xpack.graph.leaveWorkspace.confirmButtonLabel', {
          defaultMessage: 'Leave anyway',
        }),
        title: i18n.translate('xpack.graph.leaveWorkspace.modalTitle', {
          defaultMessage: 'Unsaved changes',
        }),
        'data-test-subj': 'confirmModal',
        ...options,
      };

      overlays
        .openConfirm(
          text ||
            i18n.translate('xpack.graph.leaveWorkspace.confirmText', {
              defaultMessage: 'If you leave now, you will lose unsaved changes.',
            }),
          confirmModalOptions
        )
        .then((isConfirmed) => {
          if (isConfirmed) {
            onConfirm();
          }
        });
    },
    [hasFields, overlays]
  );

  return (
    <Fragment>
      <GraphTopNavMenu
        locationUrl={locationUrl}
        workspace={workspace}
        savedWorkspace={savedWorkspace}
        onSetMenus={setMenus}
        confirmWipeWorkspace={confirmWipeWorkspace}
        setHeaderActionMenu={setHeaderActionMenu}
        graphSavePolicy={graphSavePolicy}
        navigation={navigation}
        capabilities={capabilities}
        coreStart={coreStart}
        canEditDrillDownUrls={canEditDrillDownUrls}
      />

      <InspectPanel
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
          indexPatternProvider={indexPatternProvider}
          onQuerySubmit={submit}
          confirmWipeWorkspace={confirmWipeWorkspace}
          onIndexPatternChange={onIndexPatternChange}
        />
        <EuiSpacer size="s" />
        <FieldManagerMemoized pickerOpen={pickerOpen} setPickerOpen={setPickerOpen} />
      </div>
      {!isInitialized && (
        <div>
          <GuidancePanelMemoized
            noIndexPatterns={noIndexPatterns}
            onOpenFieldPicker={onOpenFieldPicker}
          />
        </div>
      )}

      {isInitialized && workspace && <GraphView workspace={workspace} />}
    </Fragment>
  );
};

export const GraphWorkspace = connect<
  GraphWorkspaceStateProps,
  GraphWorkspaceDispatchProps,
  {},
  GraphState
>(
  (state: GraphState) => ({
    workspaceInitialized: workspaceInitializedSelector(state),
    hasFields: hasFieldsSelector(state),
    liveResponseFields: liveResponseFieldsSelector(state),
  }),
  (dispatch) => ({
    initializeWorkspace: () => {
      dispatch(initializeWorkspace());
    },
    loadSavedWorkspace: (savedWorkspace: GraphWorkspaceSavedObject) => {
      dispatch(loadSavedWorkspace(savedWorkspace));
    },
  })
)(GraphWorkspaceComponent);
