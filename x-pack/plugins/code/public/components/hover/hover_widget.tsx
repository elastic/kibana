/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexGroup, EuiText } from '@elastic/eui';
// @ts-ignore
import { renderMarkdown } from 'monaco-editor/esm/vs/base/browser/htmlContentRenderer';
// @ts-ignore
import { tokenizeToString } from 'monaco-editor/esm/vs/editor/common/modes/textToHtmlTokenizer';
import React from 'react';
import { MarkedString } from 'vscode-languageserver-types';

export interface HoverWidgetProps {
  state: HoverState;
  contents?: MarkedString[];
  fontFamily?: string;
  gotoDefinition: () => void;
  findReferences: () => void;
}

export enum HoverState {
  LOADING,
  INITIALTING,
  READY,
}

export class HoverWidget extends React.PureComponent<HoverWidgetProps> {
  public render() {
    let contents;

    switch (this.props.state) {
      case HoverState.READY:
        contents = this.renderContents();
        break;
      case HoverState.INITIALTING:
        contents = this.renderInitialting();
        break;
      case HoverState.LOADING:
      default:
        contents = this.renderLoading();
    }
    return (
      <div className="monaco-editor-hover-content">
        {contents}
        <EuiFlexGroup className="button-group euiFlexGroup" gutterSize="none" responsive={true}>
          <EuiButton size="s" onClick={this.props.gotoDefinition}>
            Goto Definition
          </EuiButton>
          <EuiButton size="s" onClick={this.props.findReferences}>
            Find Reference
          </EuiButton>
          <EuiButton size="s">Go to Type</EuiButton>
        </EuiFlexGroup>
      </div>
    );
  }

  private renderLoading() {
    return (
      <div className="hover-row">
        <div className="text-placeholder gradient" />
        <div className="text-placeholder gradient" style={{ width: '90%' }} />
        <div className="text-placeholder gradient" style={{ width: '75%' }} />
      </div>
    );
  }

  private renderContents() {
    return this.props
      .contents!.filter(content => !!content)
      .map((markedString, idx) => {
        let markdown: string;
        if (typeof markedString === 'string') {
          markdown = markedString;
        } else if (markedString.language) {
          markdown = '```' + markedString.language + '\n' + markedString.value + '\n```';
        } else {
          markdown = markedString.value;
        }
        const renderedContents: string = renderMarkdown(
          { value: markdown },
          {
            codeBlockRenderer: (language: string, value: string) => {
              const code = tokenizeToString(value, language);
              return `<span style="font-family: ${this.props.fontFamily}">${code}</span>`;
            },
          }
        ).innerHTML;
        return (
          <div
            className="hover-row"
            key={`hover_${idx}`}
            dangerouslySetInnerHTML={{ __html: renderedContents }}
          />
        );
      });
  }

  private renderInitialting() {
    return (
      <div className="hover-row">
        <EuiText>
          <h4 style={{ textAlign: 'center' }}>Language Server is initializing…</h4>
          <p style={{ color: '#8C8C8C', textAlign: 'center', fontSize: '12px' }}>
            Depending on the size of your repo, this could take a few minutes.
          </p>
        </EuiText>
      </div>
    );
  }
}
