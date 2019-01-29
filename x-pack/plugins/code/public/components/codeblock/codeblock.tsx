/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel, EuiText } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { euiCodeBlockTagColor } from '@elastic/eui/dist/eui_theme_light.json';
import { editor, IPosition, IRange } from 'monaco-editor';
import React from 'react';
import styled from 'styled-components';
import { ResizeChecker } from 'ui/resize_checker';
import { monaco } from '../../monaco/monaco';

const U = styled.u`
  color: ${euiCodeBlockTagColor};
`;

interface Props {
  code: string;
  file?: string;
  startLine?: number;
  language?: string;
  highlightRanges?: IRange[];
  onClick?: (event: IPosition) => void;
  folding: boolean;
  lineNumbersFunc: (line: number) => string;
}

export class CodeBlock extends React.PureComponent<Props> {
  private el: HTMLDivElement | null = null;
  private ed?: editor.IStandaloneCodeEditor;
  private resizeChecker?: ResizeChecker;
  private currentHighlightDecorations: string[] = [];

  public componentDidMount(): void {
    if (this.el) {
      this.ed = monaco.editor.create(this.el!, {
        value: this.props.code,
        language: this.props.language,
        lineNumbers: this.lineNumbersFunc.bind(this),
        readOnly: true,
        folding: this.props.folding,
        minimap: {
          enabled: false,
        },
        scrollbar: {
          vertical: 'hidden',
          handleMouseWheel: false,
          verticalScrollbarSize: 0,
        },
        hover: {
          enabled: false, // disable default hover;
        },
        contextmenu: false,
        selectOnLineNumbers: false,
        selectionHighlight: false,
        renderLineHighlight: 'none',
      });
      this.ed.onMouseDown((e: editor.IEditorMouseEvent) => {
        if (
          this.props.onClick &&
          (e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS ||
            e.target.type === monaco.editor.MouseTargetType.CONTENT_TEXT)
        ) {
          const lineNumber = (this.props.startLine || 0) + e.target.position.lineNumber;
          this.props.onClick({
            lineNumber,
            column: e.target.position.column,
          });
        }
      });
      if (this.props.highlightRanges) {
        const decorations = this.props.highlightRanges.map((range: IRange) => {
          return {
            range,
            options: {
              inlineClassName: 'code-search-highlight',
            },
          };
        });
        this.currentHighlightDecorations = this.ed.deltaDecorations([], decorations);
      }
      this.resizeChecker = new ResizeChecker(this.el!);
      this.resizeChecker.on('resize', () => {
        setTimeout(() => {
          this.ed!.layout();
        });
      });
    }
  }

  public componentWillReceiveProps(nextProps: Readonly<Props>, nextContext: any): void {
    if (
      nextProps.code !== this.props.code ||
      nextProps.highlightRanges !== this.props.highlightRanges
    ) {
      if (this.ed) {
        this.ed.getModel().setValue(nextProps.code);

        if (nextProps.highlightRanges) {
          const decorations = nextProps.highlightRanges!.map((range: IRange) => {
            return {
              range,
              options: {
                inlineClassName: 'code-search-highlight',
              },
            };
          });
          this.currentHighlightDecorations = this.ed.deltaDecorations(
            this.currentHighlightDecorations,
            decorations
          );
        }
      }
    }
  }

  public componentWillUnmount(): void {
    if (this.ed) {
      this.ed.dispose();
    }
  }

  public render() {
    const linesCount = this.props.code.split('\n').length;
    return (
      <EuiPanel style={{ marginBottom: '2rem' }} paddingSize="s">
        {this.props.file && (
          <React.Fragment>
            <EuiText>
              <U>{this.props.file}</U>
            </EuiText>
            <EuiSpacer size="s" />
          </React.Fragment>
        )}
        <div ref={r => (this.el = r)} style={{ height: linesCount * 18 }} />
      </EuiPanel>
    );
  }

  private lineNumbersFunc = (line: number) => {
    if (this.props.lineNumbersFunc) {
      return this.props.lineNumbersFunc(line);
    }
    return `${(this.props.startLine || 0) + line}`;
  };
}
