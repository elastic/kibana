/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { editor, IRange, Uri } from 'monaco-editor';
// @ts-ignore
import { StandaloneCodeEditorServiceImpl } from 'monaco-editor/esm/vs/editor/standalone/browser/standaloneCodeServiceImpl.js';
import { kfetch } from 'ui/kfetch';
import { ResponseError } from 'vscode-jsonrpc/lib/messages';
import { parseSchema } from '../../common/uri_util';
import { SymbolSearchResult } from '../../model';
import { history } from '../utils/url';
import { MonacoHelper } from './monaco_helper';
interface IResourceInput {
  resource: Uri;
  options?: { selection?: IRange };
}

export class EditorService extends StandaloneCodeEditorServiceImpl {
  constructor(private readonly getUrlQuery: () => string) {
    super();
  }
  public static async handleSymbolUri(qname: string, getUrlQuery: () => string) {
    const result = await EditorService.findSymbolByQname(qname);
    if (result.symbols.length > 0) {
      const symbol = result.symbols[0].symbolInformation;
      const { schema, uri } = parseSchema(symbol.location.uri);
      if (schema === 'git:') {
        const { line, character } = symbol.location.range.start;
        const url = uri + `!L${line + 1}:${character + 1}`;
        history.push(`${url}${getUrlQuery()}`);
      }
    }
  }

  public static async findSymbolByQname(qname: string) {
    try {
      const response = await kfetch({
        pathname: `/api/code/lsp/symbol/${qname}`,
        method: 'GET',
      });
      return response as SymbolSearchResult;
    } catch (e) {
      const error = e.body;
      throw new ResponseError<any>(error.code, error.message, error.data);
    }
  }
  private helper?: MonacoHelper;
  public async openCodeEditor(
    input: IResourceInput,
    source: editor.ICodeEditor,
    sideBySide?: boolean
  ) {
    const { scheme, authority, path } = input.resource;
    if (scheme === 'symbol') {
      await EditorService.handleSymbolUri(authority, this.getUrlQuery);
    } else {
      const uri = `/${authority}${path}`;
      if (input.options && input.options.selection) {
        const { startColumn, startLineNumber } = input.options.selection;
        const url = uri + `!L${startLineNumber}:${startColumn}`;
        const currentPath = window.location.hash.substring(1);
        if (currentPath === url) {
          this.helper!.revealPosition(startLineNumber, startColumn);
        } else {
          history.push(`${url}${this.getUrlQuery()}`);
        }
      }
    }
    return source;
  }

  public setMonacoHelper(helper: MonacoHelper) {
    this.helper = helper;
  }
}
