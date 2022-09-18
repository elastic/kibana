/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { ControlType, Workspace, WorkspaceField } from '../../types';

interface ControlPanelToolBarProps {
  workspace: Workspace;
  liveResponseFields: WorkspaceField[];
  onSetControl: (action: ControlType) => void;
  toggleTimebar?: () => void;
}

export const ControlPanelToolBar = ({
  workspace,
  onSetControl,
  liveResponseFields,
  toggleTimebar,
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

  const toggleTimebarMsg = i18n.translate('xpack.graph.sidebar.topMenu.toggleTimebarTooltip', {
    defaultMessage: 'Toggle timebar',
  });

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
  const onToggleTimebar = () => {
    toggleTimebar?.();
  };

  return (
    <EuiFlexGroup gutterSize="xs" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={undoButtonMsg}>
          <button
            className="kuiButton kuiButton--basic kuiButton--small"
            aria-label={undoButtonMsg}
            type="button"
            onClick={onUndoClick}
            disabled={workspace.undoLog.length < 1}
          >
            <span className="kuiIcon fa-history" />
          </button>
        </EuiToolTip>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiToolTip content={redoButtonMsg}>
          <button
            className="kuiButton kuiButton--basic kuiButton--small"
            aria-label={redoButtonMsg}
            type="button"
            onClick={onRedoClick}
            disabled={workspace.redoLog.length === 0}
          >
            <span className="kuiIcon fa-repeat" />
          </button>
        </EuiToolTip>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiToolTip content={expandButtonMsg}>
          <button
            className="kuiButton kuiButton--basic kuiButton--small"
            aria-label={expandButtonMsg}
            disabled={liveResponseFields.length === 0 || workspace.nodes.length === 0}
            onClick={onExpandButtonClick}
          >
            <span className="kuiIcon fa-plus" />
          </button>
        </EuiToolTip>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiToolTip content={addLinksButtonMsg}>
          <button
            className="kuiButton kuiButton--basic kuiButton--small"
            aria-label={addLinksButtonMsg}
            disabled={haveNodes}
            onClick={onAddLinksClick}
          >
            <span className="kuiIcon fa-link" />
          </button>
        </EuiToolTip>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiToolTip content={removeVerticesButtonMsg}>
          <button
            data-test-subj="graphRemoveSelection"
            className="kuiButton kuiButton--basic kuiButton--small"
            disabled={haveNodes}
            aria-label={removeVerticesButtonMsg}
            onClick={onRemoveVerticesClick}
          >
            <span className="kuiIcon fa-trash" />
          </button>
        </EuiToolTip>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiToolTip content={blocklistButtonMsg}>
          <button
            className="kuiButton kuiButton--basic kuiButton--small"
            disabled={workspace.selectedNodes.length === 0}
            aria-label={blocklistButtonMsg}
            onClick={onBlockListClick}
          >
            <span className="kuiIcon fa-ban" />
          </button>
        </EuiToolTip>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiToolTip content={customStyleButtonMsg}>
          <button
            className="kuiButton kuiButton--basic kuiButton--small"
            disabled={workspace.selectedNodes.length === 0}
            aria-label={customStyleButtonMsg}
            onClick={onCustomStyleClick}
          >
            <span className="kuiIcon fa-paint-brush" />
          </button>
        </EuiToolTip>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiToolTip content={drillDownButtonMsg}>
          <button
            className="kuiButton kuiButton--basic kuiButton--small"
            disabled={haveNodes}
            aria-label={drillDownButtonMsg}
            onClick={onDrillDownClick}
          >
            <span className="kuiIcon fa-info" />
          </button>
        </EuiToolTip>
      </EuiFlexItem>

      {(workspace.nodes.length === 0 || workspace.force === null) && (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={runLayoutButtonMsg}>
            <button
              data-test-subj="graphResumeLayout"
              className="kuiButton kuiButton--basic kuiButton--small"
              disabled={workspace.nodes.length === 0}
              aria-label={runLayoutButtonMsg}
              onClick={onRunLayoutClick}
            >
              <span className="kuiIcon fa-play" />
            </button>
          </EuiToolTip>
        </EuiFlexItem>
      )}

      {workspace.force !== null && workspace.nodes.length > 0 && (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={pauseLayoutButtonMsg}>
            <button
              data-test-subj="graphPauseLayout"
              className="kuiButton kuiButton--basic kuiButton--small"
              aria-label={pauseLayoutButtonMsg}
              onClick={onPauseLayoutClick}
            >
              <span className="kuiIcon fa-pause" />
            </button>
          </EuiToolTip>
        </EuiFlexItem>
      )}
      {workspace.nodes.length > 0 && toggleTimebar && (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={toggleTimebarMsg}>
            <button
              data-test-subj="toggleTimebar"
              className="kuiButton kuiButton--basic kuiButton--small"
              aria-label={toggleTimebarMsg}
              onClick={onToggleTimebar}
            >
              <span className="kuiIcon fa-clock-o" />
            </button>
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
