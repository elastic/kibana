/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import classNames from 'classnames';
import { Workspace, WorkspaceNode } from '../../types';
import { Detail } from './control_panel1';

interface SelectionListProps {
  workspace: Workspace;
  selectSelected: (node: WorkspaceNode) => void;
  isColorDark: (color: string) => boolean;
  isSelectedSelected: (node: WorkspaceNode) => boolean;
  setDetail: React.Dispatch<React.SetStateAction<Detail | undefined>>;
}

export const SelectionList = ({
  workspace,
  isColorDark,
  selectSelected,
  isSelectedSelected,
  setDetail,
}: SelectionListProps) => {
  return (
    <div className="gphSelectionList">
      {workspace.selectedNodes.length === 0 && (
        <p className="help-block">
          {i18n.translate('xpack.graph.sidebar.selections.noSelectionsHelpText', {
            defaultMessage: 'No selections. Click on vertices to add.',
          })}
        </p>
      )}

      {workspace.selectedNodes.map((n) => {
        const fieldClasses = classNames('gphSelectionList__field', {
          ['gphSelectionList__field--selected']: isSelectedSelected(n),
        });
        const fieldIconClasses = classNames('fa', 'gphNode__text', 'gphSelectionList__icon', {
          ['gphNode__text--inverse']: isColorDark(n.color),
        });

        const onSelectedFieldClick = () => {
          selectSelected(n);
        };

        const deselectNode = () => {
          workspace.deselectNode(n);
          setDetail(undefined);
        };

        return (
          <div aria-hidden="true" className={fieldClasses} onClick={onSelectedFieldClick}>
            <svg width="24" height="24">
              <circle
                className="gphNode__circle"
                r="10"
                cx="12"
                cy="12"
                style={{ fill: n.color }}
                onClick={deselectNode}
              />

              {n.icon && (
                <text
                  className={fieldIconClasses}
                  textAnchor="middle"
                  x="12"
                  y="16"
                  onClick={deselectNode}
                >
                  {n.icon.code}
                </text>
              )}
            </svg>
            <span>{n.label}</span>
            {n.numChildren > 0 && <span> (+{n.numChildren})</span>}
          </div>
        );
      })}
    </div>
  );
};
