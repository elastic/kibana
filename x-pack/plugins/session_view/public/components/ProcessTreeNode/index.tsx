/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useEffect, MouseEvent } from 'react';
import { EuiButton, EuiIcon, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { Process } from '../../hooks/use_process_tree';

const TREE_INDENT = 32;

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
  const { euiTheme } = useEuiTheme();
  const [childrenExpanded, setChildrenExpanded] = useState(isSessionLeader || process.autoExpand);

  useEffect(() => {
    setChildrenExpanded(isSessionLeader || process.autoExpand);
  }, [isSessionLeader, process.autoExpand]);

  const darkTextCSS = `
    color: ${euiTheme.colors.text};
  `;

  const searchHighlightCSS = `
    background-color: ${euiTheme.colors.highlight};
    color: ${euiTheme.colors.text};
    border-radius: 4px;
  `;

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
    const childrenCSS = `
      position: relative;
      color: white;
      margin-left: 16px;
      padding-left: 8px;
      border-left: 3px dotted ${euiTheme.colors.lightShade};
      margin-top: 8px;

      &:after {
        position: absolute;
        content: '';
        bottom: 0;
        left: -5px;
        background-color: ${euiTheme.colors.lightShade};
        width: 7px;
        height: 3px;
        border-radius: 2px;
      }
    `;

    return (
      <div css={childrenCSS}>
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
    const buttonCSS = `
      line-height: 18px;
      height: 20px;
      font-size: 11px;
      font-family: Roboto Mono;
      border-radius: 4px;
      background: rgba(0, 119, 204, 0.1);
      border: 1px solid rgba(96, 146, 192, 0.3);
      color: ${euiTheme.colors.text};
      margin-left: 8px;
    `;

    const buttons = [];

    if (!isSessionLeader && process.children.length > 0) {
      const childrenExpandedIcon = childrenExpanded ? 'arrowUp' : 'arrowDown';
      const iconCSS = `margin-left: 8px;`;

      buttons.push(
        <EuiButton css={buttonCSS} onClick={() => setChildrenExpanded(!childrenExpanded)}>
          <FormattedMessage id="kbn.sessionView.childProcesses" defaultMessage="Child processes" />
          <EuiIcon css={iconCSS} size="s" type={childrenExpandedIcon} />
        </EuiButton>
      );
    }

    return buttons;
  };

  /**
   * gets border, bg and hover colors for a process
   */
  const getProcessColors = () => {
    const bgColor = 'none';
    const hoverColor = '#6B5FC6';
    const borderColor = 'transparent';

    // TODO: alerts highlight colors

    return { bgColor, borderColor, hoverColor };
  };

  const { bgColor, borderColor, hoverColor } = getProcessColors();

  const processCSS = `
    position: relative;
    display: block;
    cursor: pointer;

    &:not(:first-child) {
      margin-top: 8px;
    }

    &:hover:before {
      opacity: 0.24;
      background-color: ${hoverColor};
    }

    &:before {
      position: absolute;
      height: 100%;
      pointer-events: none;
      content: '';
      margin-left: -${depth * TREE_INDENT}px;
      border-left: 4px solid ${borderColor};
      background-color: ${bgColor};
      width: calc(100% + ${depth * TREE_INDENT}px);
    }
  `;

  const wrapperCSS = `
    position: relative;
    padding-left: 8px;
    vertical-align: middle;
    color: ${euiTheme.colors.mediumShade};
    word-break: break-all;
    min-height: 24px;
    line-height: 24px;
  `;

  const renderSessionLeader = () => {
    const { name, user } = process.getLatest().process;
    const sessionIcon = interactive ? 'consoleApp' : 'compute';

    return (
      <>
        <EuiIcon type={sessionIcon} /> <b css={darkTextCSS}>{name}</b>
        &nbsp;
        <FormattedMessage id="kbn.sessionView.startedBy" defaultMessage="started by" />
        &nbsp;
        <EuiIcon type="user" /> <b css={darkTextCSS}>{user.name}</b>
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
        return `<span style="${searchHighlightCSS}">${match}</span>`;
      });

      return (
        <>
          {/* eslint-disable-next-line react/no-danger */}
          <span dangerouslySetInnerHTML={{ __html: text }} />
        </>
      );
    }

    const workingDirCSS = `
      color: ${euiTheme.colors.successText};
    `;

    return (
      <span>
        <span css={workingDirCSS}>{workingDirectory}</span>&nbsp;
        <span css={darkTextCSS}>{args[0]}</span>&nbsp;
        {args.slice(1).join(' ')}
        {exitCode && <small> [exit_code: {exitCode}]</small>}
      </span>
    );
  };

  const renderProcess = () => {
    const userEnteredIconCSS = `
      position: absolute;
      width: 9px;
      height: 9px;
      margin-left: -11px;
      margin-top: 8px;
    `;

     return (
      <span>
        {process.isUserEntered() && <EuiIcon css={userEnteredIconCSS} type="user" />}
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

  return (
    <div>
      <div data-id={id} key={id} css={processCSS}>
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
        <div css={wrapperCSS} onClick={onProcessClicked}>
          {isSessionLeader ? renderSessionLeader() : renderProcess()}
          {renderButtons()}
        </div>
      </div>
      {renderChildren()}
    </div>
  );
}
