/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { editor as Editor } from 'monaco-editor';
import React from 'react';
import ReactDOM from 'react-dom';
import { GitBlame } from '../../../common/git_blame';
import { BlameComponent } from '../../components/main/blame';

export class BlameWidget implements Editor.IContentWidget {
  public allowEditorOverflow = true;

  public suppressMouseDown = false;
  private domNode: HTMLDivElement;
  private containerNode: HTMLDivElement;

  constructor(readonly line: number, readonly editor: Editor) {
    this.containerNode = document.createElement('div');
    this.domNode = document.createElement('div');
    this.domNode.innerText = 'some commit message' + line;
    this.containerNode.appendChild(this.domNode);
    this.editor.onDidLayoutChange(e => this.update());
    // this.editor.onDidScrollChange(e => this.update());
    this.update();
    // @ts-ignore
    this.editor.addContentWidget(this);
    this.editor.layoutContentWidget(this);

  }

  public getDomNode(): HTMLElement {
    return this.containerNode;
  }

  public getId(): string {
    return 'blame_' + this.line;
  }

  public getPosition(): Editor.IContentWidgetPosition {
    return {
      position: {
        column: 0,
        lineNumber: this.line,
      },
      preference: [0],
    };
  }

  private update() {
    console.log('UPDATE');
    const { fontSize, lineHeight } = this.editor.getConfiguration().fontInfo;
    this.domNode.style.position = 'relative';
    this.domNode.style.left = '-300px';
    this.domNode.style.fontSize = `${fontSize}px`;
    this.domNode.style.lineHeight = `${lineHeight}px`;
    const blame: GitBlame = {
      commit: {
        id: 'abcedfe',
        date: 'Thu Jan 24 2019 16:49:49',
        message: 'some commit message',
      },
      committer: {
        email: 'test@test.com',
        name: 'someone',
      },
      lines: 1,
      startLine: this.line,
    };
    const element = React.createElement(BlameComponent, { blame, lineHeight }, null);
    // @ts-ignore
    ReactDOM.render(element, this.domNode);
  }
}
