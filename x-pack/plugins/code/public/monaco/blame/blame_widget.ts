/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { editor as Editor } from 'monaco-editor';
import React from 'react';
import ReactDOM from 'react-dom';
import { GitBlame } from '../../../common/git_blame';
import { Blame } from '../../components/main/blame';

export class BlameWidget implements Editor.IContentWidget {
  public allowEditorOverflow = true;

  public suppressMouseDown = false;
  private domNode: HTMLDivElement;
  private containerNode: HTMLDivElement;

  constructor(
    readonly blame: GitBlame,
    readonly isFirstLine: boolean,
    readonly editor: Editor.IStandaloneCodeEditor
  ) {
    this.containerNode = document.createElement('div');
    this.domNode = document.createElement('div');
    this.containerNode.appendChild(this.domNode);
    this.editor.onDidLayoutChange(() => this.update());
    // this.editor.onDidScrollChange(e => this.update());
    this.update();
    // @ts-ignore
    this.editor.addContentWidget(this);
    this.editor.layoutContentWidget(this);
  }

  public destroy() {
    this.editor.removeContentWidget(this);
  }

  public getDomNode(): HTMLElement {
    return this.containerNode;
  }

  public getId(): string {
    return 'blame_' + this.blame.startLine;
  }

  public getPosition(): Editor.IContentWidgetPosition {
    return {
      position: {
        column: 0,
        lineNumber: this.blame.startLine,
      },
      preference: [0],
    };
  }

  private update() {
    const { fontSize, lineHeight } = this.editor.getConfiguration().fontInfo;
    this.domNode.style.position = 'relative';
    this.domNode.style.left = '-332px';
    this.domNode.style.width = '316px';
    this.domNode.style.fontSize = `${fontSize}px`;
    this.domNode.style.lineHeight = `${lineHeight}px`;
    const element = React.createElement(
      Blame,
      { blame: this.blame, isFirstLine: this.isFirstLine },
      null
    );
    // @ts-ignore
    ReactDOM.render(element, this.domNode);
  }
}
