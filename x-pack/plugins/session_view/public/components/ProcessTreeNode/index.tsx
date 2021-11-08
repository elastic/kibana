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
import React, { useState, useEffect, MouseEvent } from 'react';
import { EuiButton, EuiIcon } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { Process } from '../../hooks/use_process_tree';
import { useStyles } from './styles';

interface ProcessDeps {
  process: Process;
  isSessionLeader?: boolean;
  depth?: number;
  onProcessSelected(process: Process): void;
}

/**
 * Renders a node on the process tree
 * TODO: as well as sections for tty output, alerts and file redirection.
 */
export function ProcessTreeNode({
  process,
  isSessionLeader = false,
  depth = 0,
  onProcessSelected,
}: ProcessDeps) {
  const styles = useStyles({ depth });

  const [childrenExpanded, setChildrenExpanded] = useState(isSessionLeader || process.autoExpand);

  useEffect(() => {
    setChildrenExpanded(isSessionLeader || process.autoExpand);
  }, [isSessionLeader, process.autoExpand]);

  const event = process.getLatest();

  if (!event) {
    return null;
  }

  const { interactive } = event.process;

  const renderChildren = () => {
    const { children } = process;

    if (!childrenExpanded || !children || children.length === 0) {
      return;
    }

    const newDepth = depth + 1;

    return (
      <div css={styles.children}>
        {children.map((child: Process) => {
          return (
            <ProcessTreeNode
              key={child.getEntityID()}
              process={child}
              depth={newDepth}
              onProcessSelected={onProcessSelected}
            />
          );
        })}
      </div>
    );
  };

  const renderButtons = () => {
    const buttons = [];

    if (!isSessionLeader && process.children.length > 0) {
      const childrenExpandedIcon = childrenExpanded ? 'arrowUp' : 'arrowDown';

      buttons.push(
        <EuiButton css={styles.button} onClick={() => setChildrenExpanded(!childrenExpanded)}>
          <FormattedMessage id="kbn.sessionView.childProcesses" defaultMessage="Child processes" />
          <EuiIcon css={styles.buttonArrow} size="s" type={childrenExpandedIcon} />
        </EuiButton>
      );
    }

    return buttons;
  };

  const renderSessionLeader = () => {
    const { name, user } = process.getLatest().process;
    const sessionIcon = interactive ? 'consoleApp' : 'compute';

    return (
      <>
        <EuiIcon type={sessionIcon} /> <b css={styles.darkText}>{name}</b>
        &nbsp;
        <FormattedMessage id="kbn.sessionView.startedBy" defaultMessage="started by" />
        &nbsp;
        <EuiIcon type="user" /> <b css={styles.darkText}>{user.name}</b>
      </>
    );
  };

  // TODO: not customizable for now (cmd previously offered a template string to render)
  const template = () => {
    const {
      args,
      working_directory: workingDirectory,
      exit_code: exitCode,
    } = process.getLatest().process;
    const { searchMatched } = process;

    if (searchMatched !== null) {
      const regex = new RegExp(searchMatched);

      // TODO: should we allow some form of customization via settings?
      let text = `${workingDirectory} ${args.join(' ')}`;

      text = text.replace(regex, (match) => {
        return `<span style="${styles.searchHighlight}">${match}</span>`;
      });

      return (
        <>
          {/* eslint-disable-next-line react/no-danger */}
          <span dangerouslySetInnerHTML={{ __html: text }} />
        </>
      );
    }

    return (
      <span>
        <span css={styles.workingDir}>{workingDirectory}</span>&nbsp;
        <span css={styles.darkText}>{args[0]}</span>&nbsp;
        {args.slice(1).join(' ')}
        {exitCode && <small> [exit_code: {exitCode}]</small>}
      </span>
    );
  };

  const renderProcess = () => {
    return (
      <span>
        {process.isUserEntered() && <EuiIcon css={styles.userEnteredIcon} type="user" />}
        <EuiIcon type="console" /> {template()}
      </span>
    );
  };

  const onProcessClicked = (e: MouseEvent) => {
    e.stopPropagation();

    const selection = window.getSelection();

    // do not select the command if the user was just selecting text for copy.
    if (selection && selection.type === 'Range') {
      return;
    }

    onProcessSelected(process);
  };

  const id = process.getEntityID();

  // eslint-disable-next-line
  console.log(styles); 

  return (
    <>
      <div data-id={id} key={id} css={styles.processNode}>
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
        <div css={styles.wrapper} onClick={onProcessClicked}>
          {isSessionLeader ? renderSessionLeader() : renderProcess()}
          {renderButtons()}
        </div>
      </div>
      {renderChildren()}
    </>
  );
}
