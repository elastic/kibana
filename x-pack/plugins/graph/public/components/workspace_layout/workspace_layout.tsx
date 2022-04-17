/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, memo, useCallback, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer } from '@elastic/eui';
import { connect } from 'react-redux';
import { useLocation } from 'react-router-dom';
import type { DataView } from '@kbn/data-views-plugin/public';
import { SearchBar } from '../search_bar';
import {
  GraphState,
  hasFieldsSelector,
  workspaceInitializedSelector,
} from '../../state_management';
import { FieldManager } from '../field_manager';
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
import { GraphServices } from '../../application';
import { ControlPanel } from '../control_panel';
import { GraphVisualization } from '../graph_visualization';
import { colorChoices } from '../../helpers/style_choices';
import { SharingSavedObjectProps } from '../../helpers/use_workspace_loader';
import { getEditUrl } from '../../services/url';

/**
 * Each component, which depends on `worksapce`
 * should not be memoized, since it will not get updates.
 * This behaviour should be changed after migrating `worksapce` to redux
 */
const FieldManagerMemoized = memo(FieldManager);
const GuidancePanelMemoized = memo(GuidancePanel);

type WorkspaceLayoutProps = Pick<
  GraphServices,
  | 'setHeaderActionMenu'
  | 'graphSavePolicy'
  | 'navigation'
  | 'capabilities'
  | 'coreStart'
  | 'canEditDrillDownUrls'
  | 'overlays'
  | 'spaces'
> & {
  renderCounter: number;
  workspace?: Workspace;
  loading: boolean;
  indexPatterns: IndexPatternSavedObject[];
  savedWorkspace: GraphWorkspaceSavedObject;
  indexPatternProvider: IndexPatternProvider;
  sharingSavedObjectProps?: SharingSavedObjectProps;
};

interface WorkspaceLayoutStateProps {
  workspaceInitialized: boolean;
  hasFields: boolean;
}

export const WorkspaceLayoutComponent = ({
  renderCounter,
  workspace,
  loading,
  savedWorkspace,
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
  setHeaderActionMenu,
  sharingSavedObjectProps,
  spaces,
}: WorkspaceLayoutProps & WorkspaceLayoutStateProps) => {
  const [currentIndexPattern, setCurrentIndexPattern] = useState<DataView>();
  const [showInspect, setShowInspect] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mergeCandidates, setMergeCandidates] = useState<TermIntersect[]>([]);
  const [control, setControl] = useState<ControlType>('none');
  const selectedNode = useRef<WorkspaceNode | undefined>(undefined);

  const search = useLocation().search;
  const urlQuery = new URLSearchParams(search).get('query');

  const isInitialized = Boolean(workspaceInitialized || savedWorkspace.id);

  const selectSelected = useCallback((node: WorkspaceNode) => {
    selectedNode.current = node;
    setControl('editLabel');
  }, []);

  const onSetControl = useCallback((newControl: ControlType) => {
    selectedNode.current = undefined;
    setControl(newControl);
  }, []);

  const onIndexPatternChange = useCallback(
    (indexPattern?: DataView) => setCurrentIndexPattern(indexPattern),
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

  const getLegacyUrlConflictCallout = useCallback(() => {
    // This function returns a callout component *if* we have encountered a "legacy URL conflict" scenario
    const currentObjectId = savedWorkspace.id;
    if (spaces && sharingSavedObjectProps?.outcome === 'conflict' && currentObjectId) {
      // We have resolved to one object, but another object has a legacy URL alias associated with this ID/page. We should display a
      // callout with a warning for the user, and provide a way for them to navigate to the other object.
      const otherObjectId = sharingSavedObjectProps?.aliasTargetId!; // This is always defined if outcome === 'conflict'
      const otherObjectPath =
        getEditUrl(coreStart.http.basePath.prepend, { id: otherObjectId }) + search;
      return spaces.ui.components.getLegacyUrlConflict({
        objectNoun: i18n.translate('xpack.graph.legacyUrlConflict.objectNoun', {
          defaultMessage: 'Graph',
        }),
        currentObjectId,
        otherObjectId,
        otherObjectPath,
      });
    }
    return null;
  }, [savedWorkspace.id, sharingSavedObjectProps, spaces, coreStart.http, search]);

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
        setShowInspect={setShowInspect}
        confirmWipeWorkspace={confirmWipeWorkspace}
        setHeaderActionMenu={setHeaderActionMenu}
        isInitialized={isInitialized}
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
          urlQuery={urlQuery}
          currentIndexPattern={currentIndexPattern}
          indexPatternProvider={indexPatternProvider}
          confirmWipeWorkspace={confirmWipeWorkspace}
          onIndexPatternChange={onIndexPatternChange}
        />
        <EuiSpacer size="s" />
        <FieldManagerMemoized pickerOpen={pickerOpen} setPickerOpen={setPickerOpen} />
      </div>
      {getLegacyUrlConflictCallout()}
      {!isInitialized && (
        <div>
          <GuidancePanelMemoized
            noIndexPatterns={indexPatterns.length === 0}
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
            selectedNode={selectedNode.current}
            colors={colorChoices}
            mergeCandidates={mergeCandidates}
            selectSelected={selectSelected}
            onSetControl={onSetControl}
          />
        </div>
      )}
    </Fragment>
  );
};

export const WorkspaceLayout = connect<WorkspaceLayoutStateProps, {}, {}, GraphState>(
  (state: GraphState) => ({
    workspaceInitialized: workspaceInitializedSelector(state),
    hasFields: hasFieldsSelector(state),
  })
)(WorkspaceLayoutComponent);
