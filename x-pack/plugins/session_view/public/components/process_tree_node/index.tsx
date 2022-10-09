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
  useState,
  useEffect,
  MouseEvent,
  useCallback,
  useMemo,
  RefObject,
  ReactElement,
} from 'react';
import { EuiButton, EuiIcon, EuiToolTip, formatDate } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { Process } from '../../../common/types/process_tree';
import { dataOrDash } from '../../utils/data_or_dash';
import { useVisible } from '../../hooks/use_visible';
import { ProcessTreeAlerts } from '../process_tree_alerts';
import { AlertButton, ChildrenProcessesButton, OutputButton } from './buttons';
import { useButtonStyles } from './use_button_styles';
import { useStyles } from './styles';
import { SplitText } from './split_text';
import { Nbsp } from './nbsp';
import { useDateFormat } from '../../hooks';
import { TextHighlight } from './text_highlight';

export const EXEC_USER_CHANGE = i18n.translate('xpack.sessionView.execUserChange', {
  defaultMessage: 'Exec user change',
});

export interface ProcessDeps {
  process: Process;
  isSessionLeader?: boolean;
  depth?: number;
  onProcessSelected?: (process: Process) => void;
  jumpToEntityId?: string;
  investigatedAlertId?: string;
  selectedProcess?: Process | null;
  showTimestamp: boolean;
  verboseMode: boolean;
  searchResults?: Process[];
  scrollerRef: RefObject<HTMLDivElement>;
  onChangeJumpToEventVisibility: (isVisible: boolean, isAbove: boolean) => void;
  onShowAlertDetails: (alertUuid: string) => void;
  onJumpToOutput: (entityId: string) => void;
  loadNextButton?: ReactElement | null;
  loadPreviousButton?: ReactElement | null;
}

/**
 * Renders a node on the process tree
 */
export function ProcessTreeNode({
  process,
  isSessionLeader = false,
  depth = 0,
  onProcessSelected,
  jumpToEntityId,
  investigatedAlertId,
  selectedProcess,
  showTimestamp,
  verboseMode,
  searchResults,
  scrollerRef,
  onChangeJumpToEventVisibility,
  onShowAlertDetails,
  onJumpToOutput,
  loadPreviousButton,
  loadNextButton,
}: ProcessDeps) {
  const [childrenExpanded, setChildrenExpanded] = useState(isSessionLeader || process.autoExpand);
  const [alertsExpanded, setAlertsExpanded] = useState(false);
  const { searchMatched } = process;

  const dateFormat = useDateFormat();

  useEffect(() => {
    setChildrenExpanded(process.autoExpand);
  }, [process.autoExpand]);

  // forces nodes to expand if the selected process is a descendant
  useEffect(() => {
    if (!childrenExpanded && selectedProcess) {
      if (selectedProcess.isDescendantOf(process)) {
        setChildrenExpanded(true);
      }
    }
  }, [selectedProcess, process, childrenExpanded]);

  const alerts = process.getAlerts();
  const hasAlerts = !!alerts.length;
  const hasOutputs = process.hasOutput();
  const hasInvestigatedAlert = useMemo(
    () =>
      !!(
        hasAlerts &&
        alerts.find(
          (alert) => investigatedAlertId && investigatedAlertId === alert.kibana?.alert?.uuid
        )
      ),
    [hasAlerts, alerts, investigatedAlertId]
  );
  const isSelected = selectedProcess?.id === process.id;
  const styles = useStyles({ depth, hasAlerts, hasInvestigatedAlert, isSelected, isSessionLeader });
  const buttonStyles = useButtonStyles();

  const nodeRef = useVisible({
    viewPortEl: scrollerRef.current,
    visibleCallback: useCallback(
      (isVisible, isAbove) => {
        onChangeJumpToEventVisibility(isVisible, isAbove);
      },
      [onChangeJumpToEventVisibility]
    ),
    shouldAddListener: hasInvestigatedAlert,
  });

  useEffect(() => {
    if (process.id === selectedProcess?.id && nodeRef.current?.scrollIntoView) {
      nodeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedProcess, process, nodeRef]);

  // Automatically expand alerts list when investigating an alert
  useEffect(() => {
    if (hasInvestigatedAlert) {
      setAlertsExpanded(true);
    }
  }, [hasInvestigatedAlert]);

  const onChildrenToggle = useCallback(() => {
    setChildrenExpanded(!childrenExpanded);
  }, [childrenExpanded]);

  const onAlertsToggle = useCallback(() => {
    setAlertsExpanded(!alertsExpanded);
  }, [alertsExpanded]);

  const onProcessClicked = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();

      const selection = window.getSelection();

      // do not select the command if the user was just selecting text for copy.
      if (selection && selection.type === 'Range') {
        return;
      }

      onProcessSelected?.(process);
    },
    [onProcessSelected, process]
  );

  const processDetails = process.getDetails();
  const hasExec = process.hasExec();

  const onOutputClicked = useCallback(() => {
    const entityId = processDetails.process?.entity_id;

    if (entityId) {
      onJumpToOutput(entityId);
    }
  }, [onJumpToOutput, processDetails.process?.entity_id]);

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

  const children = process.getChildren(verboseMode);

  if (!processDetails?.process) {
    return null;
  }

  const id = process.id;
  const {
    args,
    name,
    tty,
    parent,
    working_directory: workingDirectory,
    start,
    user,
  } = processDetails.process;

  const shouldRenderChildren = isSessionLeader || (childrenExpanded && children?.length > 0);
  const childrenTreeDepth = depth + 1;

  const showUserEscalation = !isSessionLeader && !!user?.name && user.name !== parent?.user?.name;
  const interactiveSession = !!tty;
  const sessionIcon = interactiveSession ? 'desktop' : 'gear';
  const iconTestSubj = hasExec
    ? 'sessionView:processTreeNodeExecIcon'
    : 'sessionView:processTreeNodeForkIcon';

  const timeStampsNormal = formatDate(start, dateFormat);

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
            <span css={styles.sessionLeader}>
              <EuiIcon type={sessionIcon} css={styles.icon} />
              <Nbsp />
              <b css={styles.darkText}>{dataOrDash(name || args?.[0])}</b>
              <Nbsp />
              <span>
                <FormattedMessage id="xpack.sessionView.startedBy" defaultMessage="started by" />
              </span>
              <Nbsp />
              <EuiIcon type="user" />
              <Nbsp />
              <b css={styles.darkText}>{dataOrDash(user?.name)}</b>
            </span>
          ) : (
            <>
              {showTimestamp && (
                <span data-test-subj="sessionView:processTreeNodeTimestamp" css={styles.timeStamp}>
                  {timeStampsNormal}
                </span>
              )}
              <EuiToolTip position="top" content={iconTooltip}>
                <EuiIcon data-test-subj={iconTestSubj} type={processIcon} css={styles.icon} />
              </EuiToolTip>
              <span css={styles.textSection}>
                <TextHighlight
                  text={`${workingDirectory ?? ''} ${args?.join(' ')}`}
                  match={process.searchMatched}
                  highlightStyle={styles.searchHighlight}
                >
                  <SplitText css={styles.workingDir}>
                    {dataOrDash(workingDirectory) + ' '}
                  </SplitText>
                  <SplitText css={styles.darkText}>{`${dataOrDash(args?.[0])}`}</SplitText>
                  <SplitText>
                    {args && args.length > 1 ? ' ' + args?.slice(1).join(' ') : ''}
                  </SplitText>
                </TextHighlight>
              </span>
            </>
          )}

          {showUserEscalation && (
            <EuiButton
              data-test-subj="sessionView:processTreeNodeRootEscalationFlag"
              css={buttonStyles.userChangedButton}
              aria-label={EXEC_USER_CHANGE}
            >
              {EXEC_USER_CHANGE} :<span>{user.name}</span>
            </EuiButton>
          )}
          {!isSessionLeader && children.length > 0 && (
            <ChildrenProcessesButton isExpanded={childrenExpanded} onToggle={onChildrenToggle} />
          )}
          {hasAlerts && (
            <AlertButton
              onToggle={onAlertsToggle}
              isExpanded={alertsExpanded}
              alertsCount={alerts.length}
            />
          )}
          {hasOutputs && <OutputButton onClick={onOutputClicked} />}
        </div>
      </div>

      {alertsExpanded && (
        <ProcessTreeAlerts
          alerts={alerts}
          investigatedAlertId={investigatedAlertId}
          isProcessSelected={isSelected}
          onAlertSelected={onProcessClicked}
          onShowAlertDetails={onShowAlertDetails}
        />
      )}

      {shouldRenderChildren && (
        <div css={styles.children}>
          {loadPreviousButton}
          {children.map((child) => {
            return (
              <ProcessTreeNode
                key={child.id}
                process={child}
                depth={childrenTreeDepth}
                onProcessSelected={onProcessSelected}
                onJumpToOutput={onJumpToOutput}
                jumpToEntityId={jumpToEntityId}
                investigatedAlertId={investigatedAlertId}
                selectedProcess={selectedProcess}
                showTimestamp={showTimestamp}
                verboseMode={verboseMode}
                searchResults={searchResults}
                scrollerRef={scrollerRef}
                onChangeJumpToEventVisibility={onChangeJumpToEventVisibility}
                onShowAlertDetails={onShowAlertDetails}
              />
            );
          })}
          {loadNextButton}
        </div>
      )}
    </div>
  );
}
