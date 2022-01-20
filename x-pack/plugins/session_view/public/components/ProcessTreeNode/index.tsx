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
import React, { useMemo, useRef, useLayoutEffect, useState, useEffect, MouseEvent } from 'react';
import { EuiButton, EuiIcon, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { Process } from '../../../common/types/process_tree';
import { sortProcesses } from '../../../common/utils/sort_processes';
import { useStyles, ButtonType } from './styles';
import { ProcessTreeAlerts } from '../ProcessTreeAlerts';

interface ProcessDeps {
  process: Process;
  isSessionLeader?: boolean;
  orphans?: Process[];
  isOrphan?: boolean;
  depth?: number;
  onProcessSelected?: (process: Process) => void;
}

/**
 * Renders a node on the process tree
 * TODO: as well as sections for tty output, alerts and file redirection.
 */
export function ProcessTreeNode({
  process,
  isSessionLeader = false,
  orphans,
  isOrphan,
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

  const processDetails = useMemo(() => {
    return process.getDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [process.events.length]);

  const hasExec = useMemo(() => {
    return process.hasExec();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [process.events.length]);

  const alerts = useMemo(() => {
    return process.getAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [process.events.length]);

  const styles = useStyles({ depth, hasAlerts: !!alerts.length });

  useLayoutEffect(() => {
    if (searchMatched !== null && textRef.current) {
      const regex = new RegExp(searchMatched);

      const text = textRef.current.innerText;
      const html = text.replace(regex, (match) => {
        return `<span style="${styles.searchHighlight}">${match}</span>`;
      });

      // eslint-disable-next-line no-unsanitized/property
      textRef.current.innerHTML = html;
    }
  }, [searchMatched, styles.searchHighlight]);

  if (!processDetails) {
    return null;
  }

  const { interactive } = processDetails.process;

  const renderChildren = () => {
    let { children } = process;

    // we pass an array of orphans to the session leader
    // for lack of a better approach, we just mix the orphans with its children and re-sort by timestamp.
    // we could just add orphans to the children of the session leader in useProcessTree, but
    // it makes it difficult to re-parent them when their parent actually shows up (e.g in the case of reverse pagination)
    if (orphans) {
      children = [...children, ...orphans].sort(sortProcesses);
    }

    // this toggle helps to de-noise the session leader process groups
    // typically caused by bashrc, shell startup, shell completions, builtins
    if (showGroupLeadersOnly) {
      children = children.filter(process => {
        const details = process.getDetails();

        return details.process.pgid === details.process.pid || process.searchMatched;
      });
    }

    if (!childrenExpanded || !children || children.length === 0) {
      return;
    }

    const newDepth = depth + 1;

    return (
      <div css={styles.children}>
        {children.map((child: Process) => {
          return (
            <ProcessTreeNode
              key={child.id}
              process={child}
              depth={newDepth}
              onProcessSelected={onProcessSelected}
            />
          );
        })}
      </div>
    );
  };

  const getExpandedIcon = (expanded: boolean) => {
    return expanded ? 'arrowUp' : 'arrowDown';
  };

  const renderButtons = () => {
    const buttons = [];

    if (process.children.length > 0) {
      if (isSessionLeader) {
        buttons.push(
          <EuiToolTip
            position="top"
            content={
              <p>
                <FormattedMessage
                  id="xpack.sessionView.groupLeaderTooltip"
                  defaultMessage="Hides or shows supplementary processes in the session leader process group. This typically includes noisy fork events, auto completions and other shell startup activity."
                />
              </p>
            }
          >
            <EuiButton
              key="child-processes-button"
              css={styles.getButtonStyle(ButtonType.children)}
              onClick={() => setShowGroupLeadersOnly(!showGroupLeadersOnly)}
              data-test-subj="processTreeNodeChildProcessesButton"
            >
              <FormattedMessage
                id="xpack.sessionView.plusCountMore"
                defaultMessage="+{count} more"
                values={{
                  count: process.children.length - 1
                }}
              />
              <EuiIcon css={styles.buttonArrow} size="s" type={getExpandedIcon(showGroupLeadersOnly)} />
            </EuiButton>
          </EuiToolTip>
        );

      } else {
        buttons.push(
          <EuiButton
            key="child-processes-button"
            css={styles.getButtonStyle(ButtonType.children)}
            onClick={() => setChildrenExpanded(!childrenExpanded)}
            data-test-subj="processTreeNodeChildProcessesButton"
          >
            <FormattedMessage
              id="xpack.sessionView.childProcesses"
              defaultMessage="Child processes"
            />
            <EuiIcon css={styles.buttonArrow} size="s" type={getExpandedIcon(childrenExpanded)} />
          </EuiButton>
        );
      }
    }

    if (alerts.length) {
      buttons.push(
        <EuiButton
          key="alert-button"
          css={styles.getButtonStyle(ButtonType.alerts)}
          onClick={() => setAlertsExpanded(!alertsExpanded)}
          data-test-subj="processTreeNodeAlertButton"
        >
          <FormattedMessage id="xpack.sessionView.alerts" defaultMessage="Alerts" />
          <EuiIcon css={styles.buttonArrow} size="s" type={getExpandedIcon(alertsExpanded)} />
        </EuiButton>
      );
    }

    return buttons;
  };

  const renderSessionLeader = () => {
    const { name, executable, user } = process.getDetails().process;
    const sessionIcon = interactive ? 'consoleApp' : 'compute';

    return (
      <>
        <EuiIcon type={sessionIcon} /> <b css={styles.darkText}>{name || executable}</b>
        &nbsp;
        <FormattedMessage id="xpack.sessionView.startedBy" defaultMessage="started by" />
        &nbsp;
        <EuiIcon type="user" /> <b css={styles.darkText}>{user.name}</b>
      </>
    );
  };

  // TODO: not customizable for now (cmd previously offered a template string to render)
  const template = () => {
    const {
      args,
      executable,
      working_directory: workingDirectory,
      exit_code: exitCode,
    } = process.getDetails().process;
    if (hasExec) {
      return (
        <span ref={textRef}>
          <span css={styles.workingDir}>{workingDirectory}</span>&nbsp;
          <span css={styles.darkText}>{args[0]}</span>&nbsp;
          {args.slice(1).join(' ')}
          {exitCode && <small> [exit_code: {exitCode}]</small>}
        </span>
      );
    } else {
      return (
        <span ref={textRef}>
          <span css={styles.darkText}>{executable}</span>&nbsp;
        </span>
      );
    }
  };

  const renderProcess = () => {
    return (
      <span>
        {process.isUserEntered() && (
          <EuiIcon
            data-test-subj="processTreeNodeUserIcon"
            css={styles.userEnteredIcon}
            type="user"
          />
        )}
        {hasExec ? (
          <EuiIcon data-test-subj="processTreeNodeExecIcon" type="console" />
        ) : (
          <EuiIcon type="branch" />
        )}
        {template()}
        {isOrphan ? '(orphaned)' : ''}
      </span>
    );
  };

  const renderRootEscalation = () => {
    const { user, parent } = processDetails.process;

    if (user.name === 'root' && user.id !== parent.user.id) {
      return (
        <EuiButton
          data-test-subj="processTreeNodeRootEscalationFlag"
          css={styles.getButtonStyle(ButtonType.userChanged)}
        >
          <FormattedMessage
            id="xpack.sessionView.execUserChange"
            defaultMessage="Root escalation"
          />
        </EuiButton>
      );
    }
  };

  const onProcessClicked = (e: MouseEvent) => {
    e.stopPropagation();

    const selection = window.getSelection();

    // do not select the command if the user was just selecting text for copy.
    if (selection && selection.type === 'Range') {
      return;
    }

    onProcessSelected?.(process);
  };

  const id = process.id;

  return (
    <>
      <div
        data-id={id}
        key={id + searchMatched}
        css={styles.processNode}
        data-test-subj="processTreeNode"
      >
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
        <div data-test-subj="processTreeNodeRow" css={styles.wrapper} onClick={onProcessClicked}>
          {isSessionLeader ? renderSessionLeader() : renderProcess()}
          {renderRootEscalation()}
          {renderButtons()}
        </div>
      </div>
      {alertsExpanded && <ProcessTreeAlerts alerts={alerts} />}
      {renderChildren()}
    </>
  );
}
