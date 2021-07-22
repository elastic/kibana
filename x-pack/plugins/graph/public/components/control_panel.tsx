/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import classNames from 'classnames';
import { UrlTemplate, Workspace, WorkspaceField, WorkspaceNode } from '../types';
import { VennDiagram } from './venn_diagram';

interface Detail {
  showDrillDowns?: boolean;
  showStyle?: boolean;
  latestNodeSelection?: WorkspaceNode;
  mergeCandidates?: any[];
}

export interface TargetOptions {
  toFields: WorkspaceField[];
}

interface ControlPanelProps {
  workspace?: Workspace;
  liveResponseFields: WorkspaceField[];
  urlTemplates: UrlTemplate[];
  detail?: Detail;
  colors: string[];
  setDetail: (data: Partial<Detail> | null) => void;
  isSelectedSelected: (node: WorkspaceNode) => boolean;
  selectSelected: (node: WorkspaceNode) => WorkspaceNode;
  isColorDark: (color: string) => boolean;
  openUrlTemplate: (template: UrlTemplate) => void;
  performMerge: (term1: any, term2: any) => void;
}

export const ControlPanel = ({
  workspace,
  liveResponseFields,
  urlTemplates,
  detail,
  colors,
  setDetail,
  isSelectedSelected,
  selectSelected,
  isColorDark,
  openUrlTemplate,
  performMerge,
}: ControlPanelProps) => {
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

  const groupButtonMsg = i18n.translate('xpack.graph.sidebar.groupButtonTooltip', {
    defaultMessage: 'group the currently selected items into {latestSelectionLabel}',
    values: { latestSelectionLabel: detail?.latestNodeSelection?.label },
  });

  const onUndoClick = () => workspace?.undo();
  const onRedoClick = () => workspace?.redo();
  const onExpandButtonClick = () => {
    setDetail(null);
    workspace?.expandSelecteds({ toFields: liveResponseFields });
  };
  const onAddLinksClick = () => workspace?.fillInGraph();
  const onRemoveVerticesClick = () => {
    setDetail(null);
    workspace?.deleteSelection();
  };
  const onBlockListClick = () => workspace?.blocklistSelection();
  const onCustomStyleClick = () => setDetail({ showStyle: true });
  const onDrillDownClick = () => setDetail({ showDrillDowns: true });
  const onRunLayoutClick = () => workspace?.runLayout();
  const onPauseLayoutClick = () => workspace?.stopLayout();

  const onSelectAllClick = () => {
    setDetail(null);
    workspace?.selectAll();
  };
  const onSelectNoneClick = () => {
    setDetail(null);
    workspace?.selectNone();
  };
  const onInvertSelectionClick = () => {
    setDetail(null);
    workspace?.selectInvert();
  };
  const onSelectNeighboursClick = () => {
    setDetail(null);
    workspace?.selectNeighbours();
  };

  const emptyIconClassFilter = (urlTemplate: UrlTemplate) => urlTemplate.icon?.class === '';
  const onGroupButtonClick = () => workspace?.groupSelections(detail?.latestNodeSelection);

  if (workspace) {
    return (
      <div id="sidebar" className="gphSidebar">
        <div>
          <EuiToolTip content={undoButtonMsg}>
            <button
              className="kuiButton kuiButton--basic kuiButton--small"
              aria-label={undoButtonMsg}
              type="button"
              onClick={onUndoClick}
              disabled={workspace === null || workspace.undoLog.length < 1}
            >
              <span className="kuiIcon fa-history" />
            </button>
          </EuiToolTip>
          <EuiToolTip content={redoButtonMsg}>
            <button
              className="kuiButton kuiButton--basic kuiButton--small"
              aria-label={redoButtonMsg}
              type="button"
              onClick={onRedoClick}
              disabled={workspace === null || workspace.redoLog.length === 0}
            >
              <span className="kuiIcon fa-repeat" />
            </button>
          </EuiToolTip>
          <EuiToolTip content={expandButtonMsg}>
            <button
              className="kuiButton kuiButton--basic kuiButton--small"
              aria-label={expandButtonMsg}
              disabled={
                workspace === null ||
                liveResponseFields?.length === 0 ||
                workspace?.nodes.length === 0
              }
              onClick={onExpandButtonClick}
            >
              <span className="kuiIcon fa-plus" />
            </button>
          </EuiToolTip>
          <EuiToolTip content={addLinksButtonMsg}>
            <button
              className="kuiButton kuiButton--basic kuiButton--small"
              aria-label={addLinksButtonMsg}
              disabled={workspace === null || workspace.nodes.length === 0}
              onClick={onAddLinksClick}
            >
              <span className="kuiIcon fa-link" />
            </button>
          </EuiToolTip>
          <EuiToolTip content={removeVerticesButtonMsg}>
            <button
              data-test-subj="graphRemoveSelection"
              className="kuiButton kuiButton--basic kuiButton--small"
              disabled={workspace === null || workspace.nodes.length === 0}
              aria-label={removeVerticesButtonMsg}
              onClick={onRemoveVerticesClick}
            >
              <span className="kuiIcon fa-trash" />
            </button>
          </EuiToolTip>
          <EuiToolTip content={blocklistButtonMsg}>
            <button
              className="kuiButton kuiButton--basic kuiButton--small"
              disabled={workspace === null || workspace.selectedNodes.length === 0}
              aria-label={blocklistButtonMsg}
              onClick={onBlockListClick}
            >
              <span className="kuiIcon fa-ban" />
            </button>
          </EuiToolTip>
          <EuiToolTip content={customStyleButtonMsg}>
            <button
              className="kuiButton kuiButton--basic kuiButton--small"
              disabled={workspace === null || workspace.selectedNodes.length === 0}
              aria-label={customStyleButtonMsg}
              onClick={onCustomStyleClick}
            >
              <span className="kuiIcon fa-paint-brush" />
            </button>
          </EuiToolTip>
          <EuiToolTip content={drillDownButtonMsg}>
            <button
              className="kuiButton kuiButton--basic kuiButton--small"
              disabled={workspace === null || workspace.nodes.length === 0}
              aria-label={drillDownButtonMsg}
              onClick={onDrillDownClick}
            >
              <span className="kuiIcon fa-info" />
            </button>
          </EuiToolTip>
          {(workspace.nodes.length === 0 || workspace.force === null) && (
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
          )}
          {workspace.force !== null && workspace?.nodes.length > 0 && (
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
          )}
        </div>

        <div>
          <div className="gphSidebar__header">
            {i18n.translate('xpack.graph.sidebar.selectionsTitle', {
              defaultMessage: 'Selections',
            })}
          </div>

          <div id="vertexSelectionTypesBar">
            <EuiToolTip content={selectAllButtonMsg}>
              <button
                data-test-subj="graphSelectAll"
                type="button"
                className="kuiButton kuiButton--basic kuiButton--small gphVertexSelect__button"
                disabled={workspace.nodes.length === 0}
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
                disabled={workspace.nodes.length === 0}
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
                disabled={workspace.nodes.length === 0}
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

          <div className="gphSelectionList">
            {workspace.selectedNodes.length === 0 && (
              <p className="help-block">
                {i18n.translate('xpack.graph.sidebar.selections.noSelectionsHelpText', {
                  defaultMessage: 'No selections. Click on vertices to add.',
                })}
              </p>
            )}

            {workspace.selectedNodes.map((n: WorkspaceNode) => {
              const fieldClasses = classNames('gphSelectionList__field', {
                ['gphSelectionList__field--selected']: isSelectedSelected(n),
              });
              const fieldIconClasses = classNames('fa', 'gphNode__text', 'gphSelectionList__icon', {
                ['gphNode__text--inverse']: isColorDark(n.color),
              });

              const onSelectedFieldClick = () => selectSelected(n);
              const deselectNode = () => workspace?.deselectNode(n);

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
        </div>

        {urlTemplates.filter(emptyIconClassFilter).length > 0 && (
          <div>
            {urlTemplates.filter(emptyIconClassFilter).map((urlTemplate) => {
              const onUrlTemplateClick = () => openUrlTemplate(urlTemplate);

              return (
                <EuiToolTip content={urlTemplate.description}>
                  <button
                    className="kuiButton kuiButton--basic kuiButton--small gphVertexSelect__button"
                    type="button"
                    disabled={workspace === null || workspace.nodes.length === 0}
                    onClick={onUrlTemplateClick}
                  >
                    <span className={`kuiIcon ${urlTemplate.icon?.class || ''}`} />
                  </button>
                </EuiToolTip>
              );
            })}
          </div>
        )}

        {detail?.showDrillDowns && (
          <div>
            <div className="gphSidebar__header">
              <span className="kuiIcon fa-info" />
              {i18n.translate('xpack.graph.sidebar.drillDownsTitle', {
                defaultMessage: 'Drill-downs',
              })}
            </div>

            <div className="gphSidebar__panel">
              {urlTemplates.length === 0 && (
                <p className="help-block">
                  {i18n.translate('xpack.graph.sidebar.drillDowns.noDrillDownsHelpText', {
                    defaultMessage: 'Configure drill-downs from the settings menu',
                  })}
                </p>
              )}

              <ul className="list-group">
                {urlTemplates.map((urlTemplate) => {
                  const onOpenUrlTemplate = () => openUrlTemplate(urlTemplate);

                  return (
                    <li className="list-group-item">
                      {urlTemplate.icon && (
                        <span className="kuiIcon gphNoUserSelect">{urlTemplate.icon?.code}</span>
                      )}
                      <a aria-hidden="true" onClick={onOpenUrlTemplate}>
                        {urlTemplate.description}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}

        {detail?.showStyle && workspace.selectedNodes.length > 0 && (
          <div className="gphSidebar__panel">
            <div className="gphSidebar__header">
              <span className="kuiIcon fa-paint-brush" />
              {i18n.translate('xpack.graph.sidebar.styleVerticesTitle', {
                defaultMessage: 'Style selected vertices',
              })}
            </div>

            <div className="form-group form-group-sm gphFormGroup--small">
              {colors.map((c) => {
                const onSelectColor = () => workspace.colorSelected(c);
                return (
                  <span
                    aria-hidden="true"
                    onClick={onSelectColor}
                    style={{ color: c }}
                    className="kuiIcon gphColorPicker__color fa-circle"
                  />
                );
              })}
            </div>
          </div>
        )}

        {detail?.latestNodeSelection && (
          <div className="gphSidebar__panel">
            <div className="gphSidebar__header">
              {detail.latestNodeSelection.icon && (
                <span className="kuiIcon {{detail.latestNodeSelection.icon.class}}" />
              )}
              {detail.latestNodeSelection.data.field} {detail.latestNodeSelection.data.term}
            </div>

            {(workspace.selectedNodes.length > 1 ||
              (workspace.selectedNodes.length > 0 &&
                workspace.selectedNodes[0] !== detail.latestNodeSelection)) && (
              <EuiToolTip content={groupButtonMsg}>
                <button
                  className="kuiButton kuiButton--basic kuiButton--iconText kuiButton--small"
                  onClick={onGroupButtonClick}
                >
                  <span className="kuiButton__icon kuiIcon fa-object-group" />
                  <FormattedMessage
                    id="xpack.graph.sidebar.groupButtonLabel"
                    defaultMessage="group"
                  />
                </button>
              </EuiToolTip>
            )}
          </div>
        )}

        {detail?.mergeCandidates && detail.mergeCandidates.length > 0 && (
          <div className="gphSidebar__panel">
            <div className="gphSidebar__header">
              <span className="kuiIcon fa-link" />
              {i18n.translate('xpack.graph.sidebar.linkSummaryTitle', {
                defaultMessage: 'Link summary',
              })}
            </div>
            {detail.mergeCandidates.map((mc) => {
              const mergeTerm1ToTerm2ButtonMsg = i18n.translate(
                'xpack.graph.sidebar.linkSummary.mergeTerm1ToTerm2ButtonTooltip',
                {
                  defaultMessage: 'Merge {term1} into {term2}',
                  values: { term1: mc.term1, term2: mc.term2 },
                }
              );
              const mergeTerm2ToTerm1ButtonMsg = i18n.translate(
                'xpack.graph.sidebar.linkSummary.mergeTerm2ToTerm1ButtonTooltip',
                {
                  defaultMessage: 'Merge {term2} into {term1}',
                  values: { term1: mc.term1, term2: mc.term2 },
                }
              );
              const leftTermCountMsg = i18n.translate(
                'xpack.graph.sidebar.linkSummary.leftTermCountTooltip',
                {
                  defaultMessage: '{count} documents have term {term}',
                  values: { count: mc.v1, term: mc.term1 },
                }
              );
              const bothTermsCountMsg = i18n.translate(
                'xpack.graph.sidebar.linkSummary.bothTermsCountTooltip',
                {
                  defaultMessage: '{count} documents have both terms',
                  values: { count: mc.overlap },
                }
              );
              const rightTermCountMsg = i18n.translate(
                'xpack.graph.sidebar.linkSummary.rightTermCountTooltip',
                {
                  defaultMessage: '{count} documents have term {term}',
                  values: { count: mc.v2, term: mc.term2 },
                }
              );

              const onMergeTerm1ToTerm2Click = () => performMerge(mc.id2, mc.id1);
              const onMergeTerm2ToTerm1Click = () => performMerge(mc.id1, mc.id2);

              return (
                <div>
                  <span>
                    <EuiToolTip content={mergeTerm1ToTerm2ButtonMsg}>
                      <button
                        type="button"
                        style={{ opacity: 0.2 + mc.overlap / mc.v1 }}
                        className="kuiButton kuiButton--basic kuiButton--small"
                        onClick={onMergeTerm1ToTerm2Click}
                      >
                        <span className="kuiIcon fa-chevron-circle-right" />
                      </button>
                    </EuiToolTip>

                    <span className="gphLinkSummary__term--1">{mc.term1}</span>
                    <span className="gphLinkSummary__term--2">{mc.term2}</span>

                    <EuiToolTip content={mergeTerm2ToTerm1ButtonMsg}>
                      <button
                        type="button"
                        className="kuiButton kuiButton--basic kuiButton--small"
                        style={{ opacity: 0.2 + mc.overlap / mc.v2 }}
                        onClick={onMergeTerm2ToTerm1Click}
                      >
                        <span className="kuiIcon fa-chevron-circle-left" />
                      </button>
                    </EuiToolTip>
                  </span>

                  <VennDiagram leftValue={mc.v1} rightValue={mc.v2} overlap={mc.overlap} />

                  <EuiToolTip content={leftTermCountMsg}>
                    <small className="gphLinkSummary__term--1">{mc.v1}</small>
                  </EuiToolTip>
                  <EuiToolTip content={bothTermsCountMsg}>
                    <small className="gphLinkSummary__term--1-2">&nbsp;({mc.overlap})&nbsp;</small>
                  </EuiToolTip>
                  <EuiToolTip content={rightTermCountMsg}>
                    <small className="gphLinkSummary__term--2">{mc.v2}</small>
                  </EuiToolTip>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return null;
};
