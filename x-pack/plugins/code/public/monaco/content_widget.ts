/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { editor as Editor } from 'monaco-editor';
// @ts-ignore
import { DomScrollableElement } from 'monaco-editor/esm/vs/base/browser/ui/scrollbar/scrollableElement';
import { Disposable } from './disposable';
import { monaco } from './monaco';

export function toggleClass(node: HTMLElement, clazzName: string, toggle: boolean) {
  node.classList.toggle(clazzName, toggle);
}

export abstract class ContentWidget extends Disposable implements Editor.IContentWidget {
  protected get isVisible(): boolean {
    return this.visible;
  }

  protected set isVisible(value: boolean) {
    this.visible = value;
    toggleClass(this.containerDomNode, 'hidden', !this.visible);
  }
  protected readonly containerDomNode: HTMLElement;
  protected domNode: HTMLElement;
  private readonly extraNode: HTMLDivElement;
  private scrollbar: any;
  private showAtPosition: Position | null;
  private stoleFocus: boolean = false;
  private visible: boolean;

  protected constructor(readonly id: string, readonly editor: Editor.ICodeEditor) {
    super();
    this.containerDomNode = document.createElement('div');
    this.domNode = document.createElement('div');
    this.extraNode = document.createElement('div');
    this.scrollbar = new DomScrollableElement(this.domNode, {});
    this.disposables.push(this.scrollbar);
    this.containerDomNode.appendChild(this.scrollbar.getDomNode());
    this.containerDomNode.appendChild(this.extraNode);

    this.visible = false;
    this.editor.onDidLayoutChange(e => this.updateMaxHeight());
    this.editor.onDidChangeModel(() => this.hide());
    this.updateMaxHeight();
    this.showAtPosition = null;
    // @ts-ignore
    this.editor.addContentWidget(this);
  }

  public getId(): string {
    return this.id;
  }

  public getDomNode(): HTMLElement {
    return this.containerDomNode;
  }

  public showAt(position: any, focus: boolean): void {
    this.showAtPosition = position;
    // @ts-ignore
    this.editor.layoutContentWidget(this);
    this.isVisible = true;
    this.editor.render();
    this.stoleFocus = focus;
    if (focus) {
      this.containerDomNode.focus();
    }
  }

  public hide(): void {
    if (!this.isVisible) {
      return;
    }

    this.isVisible = false;
    // @ts-ignore
    this.editor.layoutContentWidget(this);
    if (this.stoleFocus) {
      this.editor.focus();
    }
  }

  // @ts-ignore
  public getPosition() {
    const { ContentWidgetPositionPreference } = monaco.editor;
    if (this.isVisible) {
      return {
        position: this.showAtPosition!,
        preference: [ContentWidgetPositionPreference.ABOVE, ContentWidgetPositionPreference.BELOW],
      };
    }
    return null;
  }

  public dispose(): void {
    // @ts-ignore
    this.editor.removeContentWidget(this);
    this.disposables.forEach(d => d.dispose());
  }

  protected updateContents(node: Node, extra?: Node): void {
    this.domNode.textContent = '';
    this.domNode.appendChild(node);
    this.extraNode.innerHTML = '';
    if (extra) {
      this.extraNode.appendChild(extra);
    }
    this.updateFont();
    // @ts-ignore
    this.editor.layoutContentWidget(this);
    this.onContentsChange();
  }

  protected onContentsChange(): void {
    this.scrollbar.scanDomNode();
  }

  private updateMaxHeight() {
    const height = Math.max(this.editor.getLayoutInfo().height / 4, 250);
    const { fontSize, lineHeight } = this.editor.getConfiguration().fontInfo;

    this.domNode.style.fontSize = `${fontSize}px`;
    this.domNode.style.lineHeight = `${lineHeight}px`;
    this.domNode.style.maxHeight = `${height}px`;
  }

  private updateFont(): void {
    const codeTags: HTMLElement[] = Array.prototype.slice.call(
      this.domNode.getElementsByTagName('code')
    );
    const codeClasses: HTMLElement[] = Array.prototype.slice.call(
      this.domNode.getElementsByClassName('code')
    );

    [...codeTags, ...codeClasses].forEach(node => this.editor.applyFontInfo(node));
  }
}
