/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 *2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, {
  useRef,
  useLayoutEffect,
  useState,
  useEffect,
  MouseEvent,
  useCallback,
} from 'react';
import { EuiButton, EuiIcon, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { Process } from '../../../common/types/process_tree';
import { useStyles, ButtonType } from './styles';
import { ProcessTreeAlerts } from '../process_tree_alerts';

interface ProcessDeps {
  process: Process;
  isSessionLeader?: boolean;
  depth?: number;
  onProcessSelected?: (process: Process) => void;
}

/**
 * Renders a node on the process tree
 */
export function ProcessTreeNode({
  process,
  isSessionLeader = false,
  depth = 0,
  onProcessSelected,
}: ProcessDeps) {
  const textRef = useRef<HTMLSpanElement>(null);

  const [childrenExpanded, setChildrenExpanded] = useState(isSessionLeader || process.autoExpand);
  const [alertsExpanded, setAlertsExpanded] = useState(false);
  const [showGroupLeadersOnly, setShowGroupLeadersOnly] = useState(isSessionLeader);
  const { searchMatched } = process;

  useEffect(() => {
    setChildrenExpanded(isSessionLeader || process.autoExpand);
  }, [isSessionLeader, process.autoExpand]);

  const alerts = process.getAlerts();
  const styles = useStyles({ depth, hasAlerts: !!alerts.length });

  useLayoutEffect(() => {
    if (searchMatched !== null && textRef.current) {
      const regex = new RegExp(searchMatched);
      const text = textRef.current.textContent;

      if (text) {
        const html = text.replace(regex, (match) => {
          return `<span data-test-subj="sessionView:processNodeSearchHighlight" style="${styles.searchHighlight}">${match}</span>`;
        });

        // eslint-disable-next-line no-unsanitized/property
        textRef.current.innerHTML = html;
      }
    }
  }, [searchMatched, styles.searchHighlight]);

  const onShowGroupLeaderOnlyClick = useCallback(() => {
    setShowGroupLeadersOnly(!showGroupLeadersOnly);
  }, [showGroupLeadersOnly]);

  const toggleChildren = useCallback(() => {
    setChildrenExpanded(!childrenExpanded);
  }, [childrenExpanded]);

  const toggleAlerts = useCallback(() => {
    setAlertsExpanded(!alertsExpanded);
  }, [alertsExpanded]);

  const getExpandedIcon = (expanded: boolean) => {
    return expanded ? 'arrowUp' : 'arrowDown';
  };

  const renderButtons = useCallback(() => {
    const buttons = [];
    const childCount = process.getChildren(true).length;

    if (isSessionLeader) {
      const groupLeaderCount = process.getChildren(false).length;
      const sameGroupCount = childCount - groupLeaderCount;

      if (sameGroupCount > 0) {
        buttons.push(
          <EuiToolTip
            key="samePgidTooltip"
            position="top"
            content={
              <p>
                <FormattedMessage
                  id="xpack.sessionView.groupLeaderTooltip"
                  defaultMessage="Hide or show other processes in the same 'process group' (pgid) as the session leader. This typically includes forks from bash builtins, auto completions and other shell startup activity."
                />
              </p>
            }
          >
            <EuiButton
              key="group-leaders-only-button"
              css={styles.getButtonStyle(ButtonType.children)}
              onClick={onShowGroupLeaderOnlyClick}
              data-test-subj="sessionView:processTreeNodeChildProcessesButton"
            >
              <FormattedMessage
                id="xpack.sessionView.plusCountMore"
                defaultMessage="+{count} more"
                values={{
                  count: sameGroupCount,
                }}
              />
              <EuiIcon
                css={styles.buttonArrow}
                size="s"
                type={getExpandedIcon(showGroupLeadersOnly)}
              />
            </EuiButton>
          </EuiToolTip>
        );
      }
    } else if (childCount > 0) {
      buttons.push(
        <EuiButton
          key="child-processes-button"
          css={styles.getButtonStyle(ButtonType.children)}
          onClick={toggleChildren}
          data-test-subj="sessionView:processTreeNodeChildProcessesButton"
        >
          <FormattedMessage
            id="xpack.sessionView.childProcesses"
            defaultMessage="Child processes"
          />
          <EuiIcon css={styles.buttonArrow} size="s" type={getExpandedIcon(childrenExpanded)} />
        </EuiButton>
      );
    }

    if (alerts.length) {
      buttons.push(
        <EuiButton
          key="alert-button"
          css={styles.getButtonStyle(ButtonType.alerts)}
          onClick={toggleAlerts}
          data-test-subj="processTreeNodeAlertButton"
        >
          <FormattedMessage id="xpack.sessionView.alerts" defaultMessage="Alerts" />
          <EuiIcon css={styles.buttonArrow} size="s" type={getExpandedIcon(alertsExpanded)} />
        </EuiButton>
      );
    }

    return buttons;
  }, [
    process,
    showGroupLeadersOnly,
    styles,
    alerts.length,
    alertsExpanded,
    childrenExpanded,
    isSessionLeader,
    onShowGroupLeaderOnlyClick,
    toggleAlerts,
    toggleChildren,
  ]);

  const onProcessClicked = (e: MouseEvent) => {
    e.stopPropagation();

    const selection = window.getSelection();

    // do not select the command if the user was just selecting text for copy.
    if (selection && selection.type === 'Range') {
      return;
    }

    onProcessSelected?.(process);
  };

  const processDetails = process.getDetails();

  if (!processDetails) {
    return null;
  }

  const id = process.id;
  const { user } = processDetails;
  const {
    args,
    name,
    tty,
    parent,
    working_directory: workingDirectory,
    exit_code: exitCode,
  } = processDetails.process;

  const children = process.getChildren(!showGroupLeadersOnly);
  const shouldRenderChildren = childrenExpanded && children && children.length > 0;
  const childrenTreeDepth = depth + 1;

  const showRootEscalation = user.name === 'root' && user.id !== parent.user.id;
  const interactiveSession = !!tty;
  const sessionIcon = interactiveSession ? 'consoleApp' : 'compute';
  const hasExec = process.hasExec();
  const iconTestSubj = hasExec
    ? 'sessionView:processTreeNodeExecIcon'
    : 'sessionView:processTreeNodeForkIcon';
  const processIcon = hasExec ? 'console' : 'branch';

  return (
    <div>
      <div
        data-id={id}
        key={id + searchMatched}
        css={styles.processNode}
        data-test-subj="sessionView:processTreeNode"
      >
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
        <div
          data-test-subj="sessionView:processTreeNodeRow"
          css={styles.wrapper}
          onClick={onProcessClicked}
        >
          {isSessionLeader ? (
            <>
              <EuiIcon type={sessionIcon} /> <b css={styles.darkText}>{name || args[0]}</b>{' '}
              <FormattedMessage id="xpack.sessionView.startedBy" defaultMessage="started by" />{' '}
              <EuiIcon type="user" /> <b css={styles.darkText}>{user.name}</b>
            </>
          ) : (
            <span>
              <EuiIcon data-test-subj={iconTestSubj} type={processIcon} />
              <span ref={textRef}>
                <span css={styles.workingDir}>{workingDirectory}</span>&nbsp;
                <span css={styles.darkText}>{args[0]}</span>&nbsp;
                {args.slice(1).join(' ')}
                {exitCode !== undefined && (
                  <small data-test-subj="sessionView:processTreeNodeExitCode">
                    {' '}
                    [exit_code: {exitCode}]
                  </small>
                )}
              </span>
            </span>
          )}

          {showRootEscalation && (
            <EuiButton
              data-test-subj="sessionView:processTreeNodeRootEscalationFlag"
              css={styles.getButtonStyle(ButtonType.userChanged)}
            >
              <FormattedMessage
                id="xpack.sessionView.execUserChange"
                defaultMessage="Root escalation"
              />
            </EuiButton>
          )}

          {renderButtons()}
        </div>
      </div>

      {alertsExpanded && <ProcessTreeAlerts alerts={alerts} />}

      {shouldRenderChildren && (
        <div css={styles.children}>
          {children.map((child) => {
            return (
              <ProcessTreeNode
                key={child.id}
                process={child}
                depth={childrenTreeDepth}
                onProcessSelected={onProcessSelected}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
