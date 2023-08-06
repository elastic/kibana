/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { ControlType, Workspace, WorkspaceField } from '../../types';

interface ControlPanelToolBarProps {
  workspace: Workspace;
  liveResponseFields: WorkspaceField[];
  onSetControl: (action: ControlType) => void;
}

export const ControlPanelToolBar = ({
  workspace,
  onSetControl,
  liveResponseFields,
}: ControlPanelToolBarProps) => {
  const haveNodes = workspace.nodes.length === 0;

  const undoButtonMsg = i18n.translate('xpack.graph.sidebar.topMenu.undoButtonTooltip', {
    defaultMessage: 'Undo',
  });
  const redoButtonMsg = i18n.translate('xpack.graph.sidebar.topMenu.redoButtonTooltip', {
    defaultMessage: 'Redo',
  });
  const expandButtonMsg = i18n.translate(
    'xpack.graph.sidebar.topMenu.expandSelectionButtonTooltip',
    {
      defaultMessage: 'Expand selection',
    }
  );
  const addLinksButtonMsg = i18n.translate('xpack.graph.sidebar.topMenu.addLinksButtonTooltip', {
    defaultMessage: 'Add links between existing terms',
  });
  const removeVerticesButtonMsg = i18n.translate(
    'xpack.graph.sidebar.topMenu.removeVerticesButtonTooltip',
    {
      defaultMessage: 'Remove vertices from workspace',
    }
  );
  const blocklistButtonMsg = i18n.translate('xpack.graph.sidebar.topMenu.blocklistButtonTooltip', {
    defaultMessage: 'Block selection from appearing in workspace',
  });
  const customStyleButtonMsg = i18n.translate(
    'xpack.graph.sidebar.topMenu.customStyleButtonTooltip',
    {
      defaultMessage: 'Custom style selected vertices',
    }
  );
  const drillDownButtonMsg = i18n.translate('xpack.graph.sidebar.topMenu.drillDownButtonTooltip', {
    defaultMessage: 'Drill down',
  });
  const runLayoutButtonMsg = i18n.translate('xpack.graph.sidebar.topMenu.runLayoutButtonTooltip', {
    defaultMessage: 'Run layout',
  });
  const pauseLayoutButtonMsg = i18n.translate(
    'xpack.graph.sidebar.topMenu.pauseLayoutButtonTooltip',
    {
      defaultMessage: 'Pause layout',
    }
  );

  const onUndoClick = () => workspace.undo();
  const onRedoClick = () => workspace.redo();
  const onExpandButtonClick = () => {
    onSetControl('none');
    workspace.expandSelecteds({ toFields: liveResponseFields });
  };
  const onAddLinksClick = () => workspace.fillInGraph();
  const onRemoveVerticesClick = () => {
    onSetControl('none');
    workspace.deleteSelection();
  };
  const onBlockListClick = () => workspace.blocklistSelection();
  const onCustomStyleClick = () => onSetControl('style');
  const onDrillDownClick = () => onSetControl('drillDowns');
  const onRunLayoutClick = () => workspace.runLayout();
  const onPauseLayoutClick = () => {
    workspace.stopLayout();
    workspace.changeHandler();
  };

  return (
    <EuiFlexGroup gutterSize="xs" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={undoButtonMsg}>
          <EuiButtonIcon
            iconType={'editorUndo'}
            size="xs"
            aria-label={undoButtonMsg}
            isDisabled={workspace.undoLog.length < 1}
            onClick={onUndoClick}
          />
        </EuiToolTip>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiToolTip content={redoButtonMsg}>
          <EuiButtonIcon
            iconType="editorRedo"
            size="xs"
            aria-label={redoButtonMsg}
            isDisabled={workspace.redoLog.length === 0}
            onClick={onRedoClick}
          />
        </EuiToolTip>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiToolTip content={expandButtonMsg}>
          <EuiButtonIcon
            iconType="plus"
            size="xs"
            aria-label={expandButtonMsg}
            isDisabled={liveResponseFields.length === 0 || workspace.nodes.length === 0}
            onClick={onExpandButtonClick}
          />
        </EuiToolTip>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiToolTip content={addLinksButtonMsg}>
          <EuiButtonIcon
            iconType="link"
            size="xs"
            aria-label={addLinksButtonMsg}
            isDisabled={haveNodes}
            onClick={onAddLinksClick}
          />
        </EuiToolTip>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiToolTip content={removeVerticesButtonMsg}>
          <EuiButtonIcon
            data-test-subj="graphRemoveSelection"
            iconType="trash"
            size="xs"
            aria-label={removeVerticesButtonMsg}
            isDisabled={haveNodes}
            onClick={onRemoveVerticesClick}
          />
        </EuiToolTip>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiToolTip content={blocklistButtonMsg}>
          <EuiButtonIcon
            iconType="eyeClosed"
            size="xs"
            aria-label={blocklistButtonMsg}
            isDisabled={workspace.selectedNodes.length === 0}
            onClick={onBlockListClick}
          />
        </EuiToolTip>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiToolTip content={customStyleButtonMsg}>
          <EuiButtonIcon
            iconType="brush"
            size="xs"
            aria-label={customStyleButtonMsg}
            isDisabled={workspace.selectedNodes.length === 0}
            onClick={onCustomStyleClick}
          />
        </EuiToolTip>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiToolTip content={drillDownButtonMsg}>
          <EuiButtonIcon
            iconType="iInCircle"
            size="xs"
            aria-label={drillDownButtonMsg}
            isDisabled={haveNodes}
            onClick={onDrillDownClick}
          />
        </EuiToolTip>
      </EuiFlexItem>

      {(workspace.nodes.length === 0 || workspace.force === null) && (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={runLayoutButtonMsg}>
            <EuiButtonIcon
              data-test-subj="graphResumeLayout"
              iconType="playFilled"
              size="xs"
              aria-label={runLayoutButtonMsg}
              isDisabled={workspace.nodes.length === 0}
              onClick={onRunLayoutClick}
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}

      {workspace.force !== null && workspace.nodes.length > 0 && (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={pauseLayoutButtonMsg}>
            <EuiButtonIcon
              data-test-subj="graphPauseLayout"
              iconType="pause"
              size="xs"
              aria-label={pauseLayoutButtonMsg}
              onClick={onPauseLayoutClick}
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
