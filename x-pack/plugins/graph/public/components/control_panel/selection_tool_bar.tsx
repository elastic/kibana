/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiToolTip } from '@elastic/eui';
import { Workspace } from '../../types';
import { Detail } from './control_panel';

interface SelectionToolBarProps {
  workspace: Workspace;
  setDetail: (data?: Partial<Detail>) => void;
}

export const SelectionToolBar = ({ workspace, setDetail }: SelectionToolBarProps) => {
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
    setDetail(undefined);
    workspace.selectAll();
  };
  const onSelectNoneClick = () => {
    setDetail(undefined);
    workspace.selectNone();
  };
  const onInvertSelectionClick = () => {
    setDetail(undefined);
    workspace.selectInvert();
  };
  const onSelectNeighboursClick = () => {
    setDetail(undefined);
    workspace.selectNeighbours();
  };

  return (
    <div id="vertexSelectionTypesBar">
      <EuiToolTip content={selectAllButtonMsg}>
        <button
          data-test-subj="graphSelectAll"
          type="button"
          className="kuiButton kuiButton--basic kuiButton--small gphVertexSelect__button"
          disabled={haveNodes}
          onClick={onSelectAllClick}
        >
          {i18n.translate('xpack.graph.sidebar.selections.selectAllButtonLabel', {
            defaultMessage: 'all',
          })}
        </button>
      </EuiToolTip>
      <EuiToolTip content={selectNoneButtonMsg}>
        <button
          type="button"
          className="kuiButton kuiButton--basic kuiButton--small gphVertexSelect__button"
          disabled={haveNodes}
          onClick={onSelectNoneClick}
        >
          {i18n.translate('xpack.graph.sidebar.selections.selectNoneButtonLabel', {
            defaultMessage: 'none',
          })}
        </button>
      </EuiToolTip>
      <EuiToolTip content={invertSelectionButtonMsg}>
        <button
          data-test-subj="graphInvertSelection"
          type="button"
          className="kuiButton kuiButton--basic kuiButton--small gphVertexSelect__button"
          disabled={haveNodes}
          onClick={onInvertSelectionClick}
        >
          {i18n.translate('xpack.graph.sidebar.selections.invertSelectionButtonLabel', {
            defaultMessage: 'invert',
          })}
        </button>
      </EuiToolTip>
      <EuiToolTip content={selectNeighboursButtonMsg}>
        <button
          type="button"
          className="kuiButton kuiButton--basic kuiButton--small gphVertexSelect__button"
          disabled={workspace.selectedNodes.length === 0}
          onClick={onSelectNeighboursClick}
          data-test-subj="graphLinkedSelection"
        >
          {i18n.translate('xpack.graph.sidebar.selections.selectNeighboursButtonLabel', {
            defaultMessage: 'linked',
          })}
        </button>
      </EuiToolTip>
    </div>
  );
};
