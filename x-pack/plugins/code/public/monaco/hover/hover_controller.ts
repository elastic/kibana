/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { editor as Editor, IDisposable, IKeyboardEvent } from 'monaco-editor';
import { EditorActions } from '../../components/editor/editor';
import { monaco } from '../monaco';
import { ContentHoverWidget } from './content_hover_widget';

export class HoverController implements Editor.IEditorContribution {
  public static ID = 'code.editor.contrib.hover';
  public static get(editor: any): HoverController {
    return editor.getContribution(HoverController.ID);
  }
  private contentWidget: ContentHoverWidget;
  private disposables: IDisposable[];

  constructor(readonly editor: Editor.ICodeEditor) {
    this.disposables = [
      this.editor.onMouseMove((e: Editor.IEditorMouseEvent) => this.onEditorMouseMove(e)),
      this.editor.onKeyDown((e: IKeyboardEvent) => this.onKeyDown(e)),
    ];
    this.contentWidget = new ContentHoverWidget(editor);
  }

  public dispose(): void {
    this.disposables.forEach(d => d.dispose());
  }

  public getId(): string {
    return HoverController.ID;
  }

  public setReduxActions(actions: EditorActions) {
    this.contentWidget.setHoverResultAction(actions.hoverResult);
  }

  private onEditorMouseMove(mouseEvent: Editor.IEditorMouseEvent) {
    const targetType = mouseEvent.target.type;
    const { MouseTargetType } = monaco.editor;

    if (
      targetType === MouseTargetType.CONTENT_WIDGET &&
      mouseEvent.target.detail === ContentHoverWidget.ID
    ) {
      return;
    }

    if (targetType === MouseTargetType.CONTENT_TEXT) {
      this.contentWidget.startShowingAt(mouseEvent.target.range, false);
    } else {
      this.contentWidget.hide();
    }
  }

  private onKeyDown(e: IKeyboardEvent): void {
    if (e.keyCode === monaco.KeyCode.Escape) {
      // Do not hide hover when Ctrl/Meta is pressed
      this.contentWidget.hide();
    }
  }
}
