/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, memo, useCallback, useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer } from '@elastic/eui';
import { connect } from 'react-redux';
import { SearchBar } from '../search_bar';
import {
  GraphState,
  hasFieldsSelector,
  loadSavedWorkspace,
  submitSearch,
  workspaceInitializedSelector,
} from '../../state_management';
import { FieldManager } from '../field_manager';
import { IndexPattern } from '../../../../../../src/plugins/data/public';
import {
  ControlType,
  IndexPatternProvider,
  IndexPatternSavedObject,
  TermIntersect,
  WorkspaceNode,
} from '../../types';
import { WorkspaceTopNavMenu } from './workspace_top_nav_menu';
import { InspectPanel } from '../inspect_panel';
import { GuidancePanel } from '../guidance_panel';
import { GraphTitle } from '../graph_title';
import { GraphWorkspaceSavedObject, Workspace } from '../../types';
import { GraphDependencies } from '../../application';
import { ControlPanel } from '../control_panel';
import { GraphVisualization } from '../graph_visualization';
import { colorChoices } from '../../helpers/style_choices';

/**
 * Each component, which depends on `worksapce`
 * should not be memoized, since it will not get updates.
 * This behaviour should be changed after migrating `worksapce` to redux
 */
const FieldManagerMemoized = memo(FieldManager);
const GuidancePanelMemoized = memo(GuidancePanel);

type WorkspaceLayoutProps = Pick<
  GraphDependencies,
  | 'setHeaderActionMenu'
  | 'graphSavePolicy'
  | 'navigation'
  | 'capabilities'
  | 'coreStart'
  | 'canEditDrillDownUrls'
  | 'overlays'
> & {
  renderCounter: number;
  workspace?: Workspace;
  loading: boolean;
  locationUrl: (path?: string) => string;
  urlQuery: string;
  indexPatterns: IndexPatternSavedObject[];
  savedWorkspace: GraphWorkspaceSavedObject;
  indexPatternProvider: IndexPatternProvider;
  reloadRoute: () => void;
};

interface WorkspaceLayoutStateProps {
  workspaceInitialized: boolean;
  hasFields: boolean;
}

interface WorkspaceLayoutDispatchProps {
  submit: (searchTerm: string) => void;
  loadSavedWorkspace: (savedWorkspace: GraphWorkspaceSavedObject) => void;
}

const WorkspaceLayoutComponent = ({
  renderCounter,
  workspace,
  loading,
  locationUrl,
  savedWorkspace,
  urlQuery,
  hasFields,
  overlays,
  workspaceInitialized,
  indexPatterns,
  indexPatternProvider,
  capabilities,
  coreStart,
  graphSavePolicy,
  navigation,
  canEditDrillDownUrls,
  loadSavedWorkspace: loadSavedWorkspaceAction,
  submit,
  setHeaderActionMenu,
  reloadRoute,
}: WorkspaceLayoutProps & WorkspaceLayoutStateProps & WorkspaceLayoutDispatchProps) => {
  const [initialQuery, setInitialQuery] = useState<string>();
  const [currentIndexPattern, setCurrentIndexPattern] = useState<IndexPattern>();
  const [noIndexPatterns, setNoIndexPatterns] = useState<boolean>(false);
  const [showInspect, setShowInspect] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mergeCandidates, setMergeCandidates] = useState<TermIntersect[]>([]);
  const [control, setControl] = useState<ControlType>('none');
  const chosenNode = useRef<WorkspaceNode | undefined>(undefined);
  const isInitialized = Boolean(workspaceInitialized || savedWorkspace.id);

  const selectSelected = useCallback((node: WorkspaceNode) => {
    chosenNode.current = node;
    setControl('editLabel');
  }, []);

  const onSetControl = useCallback((newControl: ControlType) => {
    chosenNode.current = undefined;
    setControl(newControl);
  }, []);

  const isSelectedSelected = useCallback((node: WorkspaceNode) => chosenNode.current === node, []);

  // Deal with situation of request to open saved workspace
  useEffect(() => {
    if (savedWorkspace.id) {
      loadSavedWorkspaceAction(savedWorkspace);
    } else {
      setNoIndexPatterns(indexPatterns.length === 0);
    }
  }, [loadSavedWorkspaceAction, indexPatterns.length, savedWorkspace]);

  // Allow URLs to include a user-defined text query
  useEffect(() => {
    if (urlQuery && !initialQuery) {
      setInitialQuery(urlQuery);
    }
    if (initialQuery && workspace) {
      submit(urlQuery);
    }
  }, [initialQuery, submit, urlQuery, workspace]);

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

  const onSetMergeCandidates = useCallback(
    (terms: TermIntersect[]) => setMergeCandidates(terms),
    []
  );

  return (
    <Fragment>
      <WorkspaceTopNavMenu
        workspace={workspace}
        savedWorkspace={savedWorkspace}
        graphSavePolicy={graphSavePolicy}
        navigation={navigation}
        capabilities={capabilities}
        coreStart={coreStart}
        canEditDrillDownUrls={canEditDrillDownUrls}
        locationUrl={locationUrl}
        reloadRoute={reloadRoute}
        setShowInspect={setShowInspect}
        confirmWipeWorkspace={confirmWipeWorkspace}
        setHeaderActionMenu={setHeaderActionMenu}
      />

      <InspectPanel
        showInspect={showInspect}
        lastRequest={workspace?.lastRequest}
        lastResponse={workspace?.lastResponse}
        indexPattern={currentIndexPattern}
      />

      {isInitialized && <GraphTitle />}
      <div className="gphGraph__bar">
        <SearchBar
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

      {isInitialized && workspace && (
        <div className="gphGraph__container" id="GraphSvgContainer">
          <div className="gphVisualization">
            <GraphVisualization
              workspace={workspace}
              selectSelected={selectSelected}
              onSetControl={onSetControl}
              onSetMergeCandidates={onSetMergeCandidates}
            />
          </div>

          <ControlPanel
            renderCounter={renderCounter}
            workspace={workspace}
            control={control}
            chosenNode={chosenNode.current}
            colors={colorChoices}
            mergeCandidates={mergeCandidates}
            isSelectedSelected={isSelectedSelected}
            selectSelected={selectSelected}
            onSetControl={onSetControl}
          />
        </div>
      )}
    </Fragment>
  );
};

export const WorkspaceLayout = connect<
  WorkspaceLayoutStateProps,
  WorkspaceLayoutDispatchProps,
  {},
  GraphState
>(
  (state: GraphState) => ({
    workspaceInitialized: workspaceInitializedSelector(state),
    hasFields: hasFieldsSelector(state),
  }),
  (dispatch) => ({
    submit: (searchTerm: string) => {
      dispatch(submitSearch(searchTerm));
    },
    loadSavedWorkspace: (savedWorkspace: GraphWorkspaceSavedObject) => {
      dispatch(loadSavedWorkspace(savedWorkspace));
    },
  })
)(WorkspaceLayoutComponent);
