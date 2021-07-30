/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { TermIntersect, UrlTemplate, Workspace, WorkspaceField, WorkspaceNode } from '../../types';
import { urlTemplateRegex } from '../../helpers/url_template';
import { SelectionToolBar } from './selection_tool_bar';
import { ControlPanelToolBar } from './control_panel_tool_bar';
import { SelectionList } from './selection_list';
import { SelectStyle } from './select_style';
import { LatestSelectionEditor } from './latest_selection_editor';
import { MergeCandidates } from './merge_candidates';
import { DrillDowns } from './drill_downs';
import { UrlTemplateButtons } from './url_template_buttons';

export type Detail = Partial<{
  showDrillDowns: boolean;
  showStyle: boolean;
  latestNodeSelection: WorkspaceNode;
  mergeCandidates: TermIntersect[];
}>;

export interface TargetOptions {
  toFields: WorkspaceField[];
}

interface ControlPanelProps {
  workspace: Workspace;
  liveResponseFields?: WorkspaceField[];
  urlTemplates?: UrlTemplate[];
  detail?: Detail;
  colors: string[];
  setDetail: React.Dispatch<React.SetStateAction<Detail | undefined>>;
  isSelectedSelected: (node: WorkspaceNode) => boolean;
  selectSelected: (node: WorkspaceNode) => void;
  isColorDark: (color: string) => boolean;
}

export const ControlPanel = ({
  workspace,
  liveResponseFields = [],
  urlTemplates = [],
  detail,
  colors,
  setDetail,
  isSelectedSelected,
  selectSelected,
  isColorDark,
}: ControlPanelProps) => {
  if (!workspace) {
    return null;
  }

  const hasNodes = workspace.nodes.length === 0;

  const openUrlTemplate = (template: UrlTemplate) => {
    const url = template.url;
    const newUrl = url.replace(urlTemplateRegex, template.encoder.encode(workspace!));
    window.open(newUrl, '_blank');
  };

  return (
    <div id="sidebar" className="gphSidebar">
      <ControlPanelToolBar
        workspace={workspace}
        liveResponseFields={liveResponseFields}
        setDetail={setDetail}
      />

      <div>
        <div className="gphSidebar__header">
          {i18n.translate('xpack.graph.sidebar.selectionsTitle', {
            defaultMessage: 'Selections',
          })}
        </div>
        <SelectionToolBar workspace={workspace} setDetail={setDetail} />
        <SelectionList
          workspace={workspace}
          selectSelected={selectSelected}
          isColorDark={isColorDark}
          isSelectedSelected={isSelectedSelected}
          setDetail={setDetail}
        />
      </div>
      <UrlTemplateButtons
        urlTemplates={urlTemplates}
        hasNodes={hasNodes}
        openUrlTemplate={openUrlTemplate}
      />
      {detail?.showDrillDowns && (
        <DrillDowns urlTemplates={urlTemplates} openUrlTemplate={openUrlTemplate} />
      )}
      {detail?.showStyle && workspace.selectedNodes.length > 0 && (
        <SelectStyle workspace={workspace} colors={colors} />
      )}
      {detail?.latestNodeSelection && (
        <LatestSelectionEditor
          workspace={workspace}
          latestNodeSelection={detail.latestNodeSelection}
        />
      )}
      {detail?.mergeCandidates && detail.mergeCandidates.length > 0 && (
        <MergeCandidates
          workspace={workspace}
          mergeCandidates={detail.mergeCandidates}
          setDetail={setDetail}
        />
      )}
    </div>
  );
};
