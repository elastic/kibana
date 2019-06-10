/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { editor, IDisposable, Uri } from 'monaco-editor';
import chrome from 'ui/chrome';

import { ImmortalReference } from './immortal_reference';

export interface IReference<T> extends IDisposable {
  readonly object: T;
}

export interface ITextModelService {
  /**
   * Provided a resource URI, it will return a model reference
   * which should be disposed once not needed anymore.
   */
  createModelReference(resource: Uri): Promise<IReference<editor.ITextModel>>;

  /**
   * Registers a specific `scheme` content provider.
   */
  registerTextModelContentProvider(scheme: string, provider: any): IDisposable;
}

export class TextModelResolverService implements ITextModelService {
  constructor(private readonly monaco: any) {}

  public async createModelReference(resource: Uri): Promise<IReference<any>> {
    let model = this.monaco.editor.getModel(resource);
    if (!model) {
      const result = await this.fetchText(resource);
      if (!result) {
        return new ImmortalReference(null);
      } else {
        model = this.monaco.editor.createModel(result.text, result.lang, resource);
      }
    }
    return new ImmortalReference({ textEditorModel: model });
  }

  public registerTextModelContentProvider(scheme: string, provider: any): IDisposable {
    return {
      dispose() {
        /* no op */
      },
    };
  }

  private async fetchText(resource: Uri) {
    const repo = `${resource.authority}${resource.path}`;
    const revision = resource.query;
    const file = resource.fragment;
    const response = await fetch(
      chrome.addBasePath(`/api/code/repo/${repo}/blob/${revision}/${file}`)
    );
    if (response.status === 200) {
      const contentType = response.headers.get('Content-Type');

      if (contentType && contentType.startsWith('text/')) {
        const lang = contentType.split(';')[0].substring('text/'.length);
        const text = await response.text();
        return { text, lang };
      }
    } else {
      return null;
    }
  }
}
