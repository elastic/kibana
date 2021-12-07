/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { ControlType, Workspace } from '../../types';

interface SelectionToolBarProps {
  workspace: Workspace;
  onSetControl: (data: ControlType) => void;
}

export const SelectionToolBar = ({ workspace, onSetControl }: SelectionToolBarProps) => {
  const haveNodes = workspace.nodes.length === 0;

  const selectAllButtonMsg = i18n.translate(
    'xpack.graph.sidebar.selections.selectAllButtonTooltip',
    {
      defaultMessage: 'Select all',
    }
  );
  const selectNoneButtonMsg = i18n.translate(
    'xpack.graph.sidebar.selections.selectNoneButtonTooltip',
    {
      defaultMessage: 'Select none',
    }
  );
  const invertSelectionButtonMsg = i18n.translate(
    'xpack.graph.sidebar.selections.invertSelectionButtonTooltip',
    {
      defaultMessage: 'Invert selection',
    }
  );
  const selectNeighboursButtonMsg = i18n.translate(
    'xpack.graph.sidebar.selections.selectNeighboursButtonTooltip',
    {
      defaultMessage: 'Select neighbours',
    }
  );

  const onSelectAllClick = () => {
    onSetControl('none');
    workspace.selectAll();
    workspace.changeHandler();
  };
  const onSelectNoneClick = () => {
    onSetControl('none');
    workspace.selectNone();
    workspace.changeHandler();
  };
  const onInvertSelectionClick = () => {
    onSetControl('none');
    workspace.selectInvert();
    workspace.changeHandler();
  };
  const onSelectNeighboursClick = () => {
    onSetControl('none');
    workspace.selectNeighbours();
    workspace.changeHandler();
  };

  return (
    <EuiFlexGroup
      className="vertexSelectionTypesBar"
      justifyContent="flexStart"
      gutterSize="s"
      alignItems="center"
      responsive={false}
    >
      <EuiFlexItem grow={false}>
        <EuiToolTip content={selectAllButtonMsg}>
          <button
            data-test-subj="graphSelectAll"
            type="button"
            className="kuiButton kuiButton--basic kuiButton--small"
            disabled={haveNodes}
            onClick={onSelectAllClick}
          >
            {i18n.translate('xpack.graph.sidebar.selections.selectAllButtonLabel', {
              defaultMessage: 'all',
            })}
          </button>
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={selectNoneButtonMsg}>
          <button
            type="button"
            className="kuiButton kuiButton--basic kuiButton--small"
            disabled={haveNodes}
            onClick={onSelectNoneClick}
          >
            {i18n.translate('xpack.graph.sidebar.selections.selectNoneButtonLabel', {
              defaultMessage: 'none',
            })}
          </button>
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={invertSelectionButtonMsg}>
          <button
            data-test-subj="graphInvertSelection"
            type="button"
            className="kuiButton kuiButton--basic kuiButton--small"
            disabled={haveNodes}
            onClick={onInvertSelectionClick}
          >
            {i18n.translate('xpack.graph.sidebar.selections.invertSelectionButtonLabel', {
              defaultMessage: 'invert',
            })}
          </button>
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={selectNeighboursButtonMsg}>
          <button
            type="button"
            className="kuiButton kuiButton--basic kuiButton--small"
            disabled={workspace.selectedNodes.length === 0}
            onClick={onSelectNeighboursClick}
            data-test-subj="graphLinkedSelection"
          >
            {i18n.translate('xpack.graph.sidebar.selections.selectNeighboursButtonLabel', {
              defaultMessage: 'linked',
            })}
          </button>
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
