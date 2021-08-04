/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, memo, useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer } from '@elastic/eui';
import { connect, useStore } from 'react-redux';
import { SearchBar } from '../search_bar';
import {
  GraphState,
  hasFieldsSelector,
  initializeWorkspace,
  liveResponseFieldsSelector,
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
const InspectPanelMemoized = memo(InspectPanel);

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
  location: angular.ILocationService;
  query: string;
  indexPatterns: IndexPatternSavedObject[];
  savedWorkspace: GraphWorkspaceSavedObject;
  indexPatternProvider: IndexPatternProvider;
};

interface GraphWorkspaceStateProps {
  liveResponseFields: WorkspaceField[];
  workspaceInitialized: boolean;
}

interface GraphWorkspaceDispatchProps {
  initializeWorkspace: () => void;
}

const GraphWorkspaceComponent = (
  props: GraphWorkspaceProps & GraphWorkspaceStateProps & GraphWorkspaceDispatchProps
) => {
  const store = useStore();
  const [initialQuery, setInitialQuery] = useState<string>();
  const [currentIndexPattern, setCurrentIndexPattern] = useState<IndexPattern>();
  const [noIndexPatterns, setNoIndexPatterns] = useState<boolean>(false);
  const isInitialized = Boolean(props.workspaceInitialized || props.savedWorkspace.id);

  const [menus, setMenus] = useState<MenuOptions>({
    showSettings: false,
    showInspect: false,
  });
  const [pickerOpen, setPickerOpen] = useState(false);

  // Deal with situation of request to open saved workspace
  useEffect(() => {
    if (props.savedWorkspace.id) {
      store.dispatch({
        type: 'x-pack/graph/LOAD_WORKSPACE',
        payload: props.savedWorkspace,
      });
    } else {
      setNoIndexPatterns(props.indexPatterns.length === 0);
    }
  }, [props.indexPatterns.length, props.savedWorkspace, store]);

  const handleError = useCallback(
    (err: Error | string) => {
      const toastTitle = i18n.translate('xpack.graph.errorToastTitle', {
        defaultMessage: 'Graph Error',
        description: '"Graph" is a product name and should not be translated.',
      });
      if (err instanceof Error) {
        props.toastNotifications.addError(err, {
          title: toastTitle,
        });
      } else {
        props.toastNotifications.addDanger({
          title: toastTitle,
          text: String(err),
        });
      }
    },
    [props.toastNotifications]
  );

  const submit = useCallback(
    (searchTerm: string) => {
      props.initializeWorkspace();
      // type casting is safe, at this point workspace should be loaded
      const numHops = 2;
      const curWorkspace = props.workspace as Workspace;
      if (searchTerm.startsWith('{')) {
        try {
          const query = JSON.parse(searchTerm);
          if (query.vertices) {
            // Is a graph explore request
            curWorkspace.callElasticsearch(query);
          } else {
            // Is a regular query DSL query
            curWorkspace.search(query, props.liveResponseFields, numHops);
          }
        } catch (err) {
          handleError(err);
        }
        return;
      }
      curWorkspace.simpleSearch(searchTerm, props.liveResponseFields, numHops);
    },
    [props, handleError]
  );

  // Allow URLs to include a user-defined text query
  useEffect(() => {
    if (props.query) {
      setInitialQuery(props.query);
      if (props.workspace) {
        submit(props.query);
      }
    }
  }, [props.query, submit, props.workspace]);

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
      if (!hasFieldsSelector(store.getState())) {
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

      props.overlays
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
    [props.overlays, store]
  );

  return (
    <Fragment>
      <GraphTopNavMenu
        location={props.location}
        workspace={props.workspace}
        savedWorkspace={props.savedWorkspace}
        onSetMenus={setMenus}
        confirmWipeWorkspace={confirmWipeWorkspace}
        setHeaderActionMenu={props.setHeaderActionMenu}
        graphSavePolicy={props.graphSavePolicy}
        navigation={props.navigation}
        capabilities={props.capabilities}
        coreStart={props.coreStart}
        canEditDrillDownUrls={props.canEditDrillDownUrls}
      />

      <InspectPanelMemoized
        showInspect={menus.showInspect}
        lastRequest={props.workspace?.lastRequest}
        lastResponse={props.workspace?.lastResponse}
        indexPattern={currentIndexPattern}
      />

      {isInitialized && <GraphTitle />}
      <div className="gphGraph__bar">
        <SearchBarMemoized
          isLoading={props.loading}
          initialQuery={initialQuery}
          currentIndexPattern={currentIndexPattern}
          indexPatternProvider={props.indexPatternProvider}
          onQuerySubmit={submit}
          confirmWipeWorkspace={confirmWipeWorkspace}
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

      {isInitialized && props.workspace && <GraphView workspace={props.workspace} />}
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
    liveResponseFields: liveResponseFieldsSelector(state),
  }),
  (dispatch) => ({
    initializeWorkspace: () => {
      dispatch(initializeWorkspace());
    },
  })
)(GraphWorkspaceComponent);
