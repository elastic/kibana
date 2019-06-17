/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel } from '@elastic/eui';
import { editor, IPosition, IRange } from 'monaco-editor';
import React from 'react';
import { ResizeChecker } from 'ui/resize_checker';
import { monaco } from '../../monaco/monaco';
import { registerEditor } from '../../monaco/single_selection_helper';

interface Props {
  code: string;
  fileComponent?: React.ReactNode;
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
        renderIndentGuides: false,
        automaticLayout: false,
      });
      this.ed.onMouseDown((e: editor.IEditorMouseEvent) => {
        if (
          this.props.onClick &&
          (e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS ||
            e.target.type === monaco.editor.MouseTargetType.CONTENT_TEXT)
        ) {
          const position = e.target.position || { lineNumber: 0, column: 0 };
          const lineNumber = (this.props.startLine || 0) + position.lineNumber;
          this.props.onClick({
            lineNumber,
            column: position.column,
          });
        }
      });
      registerEditor(this.ed);
      if (this.props.highlightRanges) {
        const decorations = this.props.highlightRanges.map((range: IRange) => {
          return {
            range,
            options: {
              inlineClassName: 'codeSearch__highlight',
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

  public componentDidUpdate(prevProps: Readonly<Props>) {
    if (
      prevProps.code !== this.props.code ||
      prevProps.highlightRanges !== this.props.highlightRanges
    ) {
      if (this.ed) {
        const model = this.ed.getModel();
        if (model) {
          model.setValue(this.props.code);

          if (this.props.highlightRanges) {
            const decorations = this.props.highlightRanges!.map((range: IRange) => {
              return {
                range,
                options: {
                  inlineClassName: 'codeSearch__highlight',
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
        {this.props.fileComponent}
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
