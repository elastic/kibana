/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiText } from '@elastic/eui';
import theme from '@elastic/eui/dist/eui_theme_light.json';
// @ts-ignore
import { renderMarkdown } from 'monaco-editor/esm/vs/base/browser/htmlContentRenderer';
// @ts-ignore
import { tokenizeToString } from 'monaco-editor/esm/vs/editor/common/modes/textToHtmlTokenizer';
import React from 'react';
import styled from 'styled-components';
import { MarkedString } from 'vscode-languageserver-types';

const Text = styled(EuiText)`
  p {
    color: #8c8c8c;
    font-size: ${theme.euiFontSizeXS};
  }
`;

export interface HoverWidgetProps {
  state: HoverState;
  contents?: MarkedString[];
  gotoDefinition: () => void;
  findReferences: () => void;
}

export enum HoverState {
  LOADING,
  INITIALIZING,
  READY,
}

export class HoverWidget extends React.PureComponent<HoverWidgetProps> {
  public render() {
    let contents;

    switch (this.props.state) {
      case HoverState.READY:
        contents = this.renderContents();
        break;
      case HoverState.INITIALIZING:
        contents = this.renderInitialting();
        break;
      case HoverState.LOADING:
      default:
        contents = this.renderLoading();
    }
    return <React.Fragment>{contents}</React.Fragment>;
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
              return `<span>${code}</span>`;
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
        <Text textAlign="center">
          <h4>Language Server is initializing…</h4>
          <p>Depending on the size of your repo, this could take a few minutes.</p>
        </Text>
      </div>
    );
  }
}
