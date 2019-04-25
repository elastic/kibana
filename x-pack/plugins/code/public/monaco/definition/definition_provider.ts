/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DetailSymbolInformation, SymbolLocator } from '@elastic/lsp-extension';
import { flatten } from 'lodash';
import { editor, languages } from 'monaco-editor';
import { kfetch } from 'ui/kfetch';
import { Location } from 'vscode-languageserver-types';
import { LspRestClient, TextDocumentMethods } from '../../../common/lsp_client';

export function provideDefinition(monaco: any, model: editor.ITextModel, position: any) {
  const lspClient = new LspRestClient('/api/code/lsp');
  const lspMethods = new TextDocumentMethods(lspClient);
  function handleLocation(location: Location): languages.Location {
    return {
      uri: monaco.Uri.parse(location.uri),
      range: {
        startLineNumber: location.range.start.line + 1,
        startColumn: location.range.start.character + 1,
        endLineNumber: location.range.end.line + 1,
        endColumn: location.range.end.character + 1,
      },
    };
  }

  async function handleQname(qname: string) {
    const res: any = await kfetch({ pathname: `/api/code/lsp/symbol/${qname}` });
    if (res.symbols) {
      return res.symbols.map((s: DetailSymbolInformation) =>
        handleLocation(s.symbolInformation.location)
      );
    }
    return [];
  }

  return lspMethods.edefinition
    .send({
      position: {
        line: position.lineNumber - 1,
        character: position.column - 1,
      },
      textDocument: {
        uri: model.uri.toString(),
      },
    })
    .then(
      (result: SymbolLocator[]) => {
        if (result) {
          const locations = result.filter(l => l.location !== undefined);
          if (locations.length > 0) {
            return locations.map(l => handleLocation(l.location!));
          } else {
            return Promise.all(
              result.filter(l => l.qname !== undefined).map(l => handleQname(l.qname!))
            ).then(flatten);
          }
        } else {
          return [];
        }
      },
      (_: any) => {
        return [];
      }
    );
}
