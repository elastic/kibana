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
  useMemo,
  RefObject,
} from 'react';
import { EuiButton, EuiIcon, EuiToolTip, formatDate } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { Process } from '../../../common/types/process_tree';
import { useVisible } from '../../hooks/use_visible';
import { ProcessTreeAlerts } from '../process_tree_alerts';
import { AlertButton, ChildrenProcessesButton } from './buttons';
import { useButtonStyles } from './use_button_styles';
import { KIBANA_DATE_FORMAT } from '../../../common/constants';
import { useStyles } from './styles';

export interface ProcessDeps {
  process: Process;
  isSessionLeader?: boolean;
  depth?: number;
  onProcessSelected?: (process: Process) => void;
  jumpToEventID?: string;
  jumpToAlertID?: string;
  selectedProcessId?: string;
  timeStampOn?: boolean;
  verboseModeOn?: boolean;
  scrollerRef: RefObject<HTMLDivElement>;
  onChangeJumpToEventVisibility: (isVisible: boolean, isAbove: boolean) => void;
}

/**
 * Renders a node on the process tree
 */
export function ProcessTreeNode({
  process,
  isSessionLeader = false,
  depth = 0,
  onProcessSelected,
  jumpToEventID,
  jumpToAlertID,
  selectedProcessId,
  timeStampOn = true,
  verboseModeOn = true,
  scrollerRef,
  onChangeJumpToEventVisibility,
}: ProcessDeps) {
  const textRef = useRef<HTMLSpanElement>(null);

  const [childrenExpanded, setChildrenExpanded] = useState(isSessionLeader || process.autoExpand);
  const [alertsExpanded, setAlertsExpanded] = useState(false);
  const { searchMatched } = process;

  useEffect(() => {
    setChildrenExpanded(isSessionLeader || process.autoExpand);
  }, [isSessionLeader, process.autoExpand]);

  const alerts = process.getAlerts();
  const hasAlerts = useMemo(() => !!alerts.length, [alerts]);
  const hasInvestigatedAlert = useMemo(
    () =>
      !!(
        hasAlerts &&
        alerts.find((alert) => jumpToAlertID && jumpToAlertID === alert.kibana?.alert.uuid)
      ),
    [hasAlerts, alerts, jumpToAlertID]
  );
  const styles = useStyles({ depth, hasAlerts, hasInvestigatedAlert });
  const buttonStyles = useButtonStyles({});

  const nodeRef = useVisible({
    viewPortEl: scrollerRef.current,
    visibleCallback: (isVisible, isAbove) => {
      onChangeJumpToEventVisibility(isVisible, isAbove);
    },
    shouldAddListener: jumpToEventID === process.id,
  });

  // Automatically expand alerts list when investigating an alert
  useEffect(() => {
    if (hasInvestigatedAlert) {
      setAlertsExpanded(true);
    }
  }, [hasInvestigatedAlert]);

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

  const onChildrenToggle = useCallback(() => {
    setChildrenExpanded(!childrenExpanded);
  }, [childrenExpanded]);

  const onAlertsToggle = useCallback(() => {
    setAlertsExpanded(!alertsExpanded);
  }, [alertsExpanded]);

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
  const hasExec = process.hasExec();

  const processIcon = useMemo(() => {
    if (!process.parent) {
      return 'unlink';
    } else if (hasExec) {
      return 'console';
    } else {
      return 'branch';
    }
  }, [hasExec, process.parent]);

  const iconTooltip = useMemo(() => {
    if (!process.parent) {
      return i18n.translate('xpack.sessionView.processNode.tooltipOrphan', {
        defaultMessage: 'Process missing parent (orphan)',
      });
    } else if (hasExec) {
      return i18n.translate('xpack.sessionView.processNode.tooltipExec', {
        defaultMessage: "Process exec'd",
      });
    } else {
      return i18n.translate('xpack.sessionView.processNode.tooltipFork', {
        defaultMessage: 'Process forked (no exec)',
      });
    }
  }, [hasExec, process.parent]);

  if (!processDetails?.process) {
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
    start,
  } = processDetails.process;

  const children = process.getChildren(verboseModeOn);
  const childCount = process.getChildren(true).length;
  const shouldRenderChildren = childrenExpanded && children && children.length > 0;
  const childrenTreeDepth = depth + 1;

  const showUserEscalation = user.id !== parent.user.id;
  const interactiveSession = !!tty;
  const sessionIcon = interactiveSession ? 'consoleApp' : 'compute';
  const iconTestSubj = hasExec
    ? 'sessionView:processTreeNodeExecIcon'
    : 'sessionView:processTreeNodeForkIcon';

  const timeStampsNormal = formatDate(start, KIBANA_DATE_FORMAT);

  return (
    <div>
      <div
        data-id={id}
        key={id + searchMatched}
        css={styles.processNode}
        data-test-subj="sessionView:processTreeNode"
        ref={nodeRef}
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
              <EuiToolTip position="top" content={iconTooltip}>
                <EuiIcon data-test-subj={iconTestSubj} type={processIcon} />
              </EuiToolTip>{' '}
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
                {timeStampOn && (
                  <span
                    data-test-subj="sessionView:processTreeNodeTimestamp"
                    css={styles.timeStamp}
                  >
                    {timeStampsNormal}
                  </span>
                )}
                ;
              </span>
            </span>
          )}

          {showUserEscalation && (
            <EuiButton
              data-test-subj="sessionView:processTreeNodeRootEscalationFlag"
              css={buttonStyles.userChangedButton}
            >
              <FormattedMessage
                id="xpack.sessionView.execUserChange"
                defaultMessage="Exec user change: "
              />
              <span css={buttonStyles.userChangedButtonUsername}>{user.name}</span>
            </EuiButton>
          )}
          {!isSessionLeader && childCount > 0 && (
            <ChildrenProcessesButton isExpanded={childrenExpanded} onToggle={onChildrenToggle} />
          )}
          {alerts.length > 0 && (
            <AlertButton
              onToggle={onAlertsToggle}
              isExpanded={alertsExpanded}
              alertsCount={alerts.length}
            />
          )}
        </div>
      </div>

      {alertsExpanded && (
        <ProcessTreeAlerts
          alerts={alerts}
          jumpToAlertID={jumpToAlertID}
          isProcessSelected={selectedProcessId === process.id}
          onAlertSelected={onProcessClicked}
        />
      )}

      {shouldRenderChildren && (
        <div css={styles.children}>
          {children.map((child) => {
            return (
              <ProcessTreeNode
                key={child.id}
                process={child}
                depth={childrenTreeDepth}
                onProcessSelected={onProcessSelected}
                jumpToEventID={jumpToEventID}
                jumpToAlertID={jumpToAlertID}
                selectedProcessId={selectedProcessId}
                timeStampOn={timeStampOn}
                verboseModeOn={verboseModeOn}
                scrollerRef={scrollerRef}
                onChangeJumpToEventVisibility={onChangeJumpToEventVisibility}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
