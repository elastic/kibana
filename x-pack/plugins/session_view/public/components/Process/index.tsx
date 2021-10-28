/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, MouseEvent } from 'react';
import { IProcess } from '../../hooks/use_process_tree';
import { EuiButton, EuiIcon, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

const TREE_INDENT = 32;

interface IProcessDeps {
  process: IProcess;
  isSessionLeader?: boolean;
  depth?: number;
  onProcessSelected(process: IProcess): void;
}

/**
 * Renders a node on the process tree
 * TODO: as well as sections for tty output, alerts and file redirection.
 */
function Process({ process, isSessionLeader = false, depth = 0, onProcessSelected }: IProcessDeps) {
  const { euiTheme } = useEuiTheme();
  const [childrenExpanded, setChildrenExpanded] = useState(isSessionLeader || process.autoExpand);

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

  function renderChildren() {
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
        {children.map((child: IProcess) => {
          return <Process process={child} depth={newDepth} onProcessSelected={onProcessSelected} />;
        })}
      </div>
    );
  }

  function renderButtons() {
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
  }

  /**
   * gets border, bg and hover colors for a process
   */
  function getProcessColors() {
    let bgColor = 'none';
    let hoverColor = '#6B5FC6';
    let borderColor = 'transparent';

    // if (props.isSummaryMatch) {
    //   borderColor = '#8070F1'
    //   bgColor = '#6B5FC629'
    // }

    // if (props.highlightAlert) {
    //   bgColor = props.alertLevel > 0 ? props.theme['--color-red-500-16'] : props.theme['--color-cmdyellow-16']
    // }

    // if (props.alertLevel >= 0) {
    //   if (props.alertLevel > 0) {
    //     borderColor = props.theme['--color-red-500']
    //     hoverColor = props.theme['--color-red-500-16']
    //   } else {
    //     borderColor = props.theme['--color-cmdyellow']
    //     hoverColor = props.theme['--color-cmdyellow-16']
    //   }
    // }

    return { bgColor, borderColor, hoverColor };
  }

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

  function renderSessionLeader() {
    const event = process.getLatest();
    const { name, user } = event.process;
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
  }

  // TODO: not customizable for now (cmd previously offered a template string to render)
  const template = (process: IProcess) => {
    const event = process.getLatest();
    const { args, working_directory } = event.process;
    const { searchMatched } = process;

    if (searchMatched !== null) {
      const regex = new RegExp(searchMatched);

      //TODO: should we allow some form of customization via settings?
      let text = `${working_directory} ${args.join(' ')}`;

      text = text.replace(regex, (match) => {
        return `<span style="${searchHighlightCSS}">${match}</span>`;
      });

      return (
        <>
          <span dangerouslySetInnerHTML={{ __html: text }} />
        </>
      );
    }

    const workingDirCSS = `
      color: ${euiTheme.colors.successText};
    `;

    return (
      <>
        <span css={workingDirCSS}>{working_directory}</span>&nbsp;
        <span css={darkTextCSS}>{args[0]}</span>&nbsp;
        {args.slice(1).join(' ')}
      </>
    );
  };

  function renderProcess() {
    const userEnteredIconCSS = `
      position: absolute;
      width: 9px;
      height: 9px;
      margin-left: -11px;
      margin-top: 8px;
    `;

    return (
      <>
        {process.isUserEntered() && <EuiIcon css={userEnteredIconCSS} type="user" />}
        <EuiIcon type="console" /> {template(process)}
      </>
    );
  }

  /**
   * calls up to terminal to show details for this command
   */
  function onProcessClicked(e: MouseEvent): void {
    e.stopPropagation();

    const selection = window.getSelection();

    // do not select the command if the user was just selecting text for copy.
    if (selection && selection.type === 'Range') {
      return;
    }

    onProcessSelected(process);
  }

  const id = process.getEntityID();

  return (
    <>
      <div data-id={id} key={id} css={processCSS}>
        <div css={wrapperCSS} onClick={onProcessClicked}>
          {isSessionLeader ? renderSessionLeader() : renderProcess()}
          {renderButtons()}
        </div>
      </div>
      {renderChildren()}
    </>
  );
}

export default Process;
