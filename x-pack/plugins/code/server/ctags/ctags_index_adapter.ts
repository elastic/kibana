/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DetailSymbolInformation } from '@elastic/lsp-extension';
import { Tag } from '../../model';
import { SymbolInformation, Range, Position, MarkedString, SymbolKind } from 'vscode-languageserver-protocol';

export class CtagsIndexAdapter {

  public static ctags2DetailSymbol(originalTags: Tag[]): DetailSymbolInformation[] {
    let detailSymbols: DetailSymbolInformation[] = [];
    if (originalTags.length !== 0) {
      originalTags.forEach(t => {
        const name = t.symbol;
        const type = t.type;
        const hoverText = t.text;
        const line = t.line;
        const startCharacter = t.lineStart;
        const endCharacter = t.lineEnd;
        const clazz = t.clazz;
        let tmpDetailSymbol: DetailSymbolInformation = {
          symbolInformation: SymbolInformation.create('', 1, Range.create(Position.create(0, 0), Position.create(0, 0)), undefined, clazz),
          qname: '',
          contents: MarkedString.fromPlainText(hoverText)
        };
        switch(type) {
          case 'package':
            tmpDetailSymbol = {
              symbolInformation: SymbolInformation.create(name, SymbolKind.Package, Range.create(Position.create(line, startCharacter), Position.create(line, endCharacter)), undefined, clazz),
              qname: name,
              contents: MarkedString.fromPlainText(hoverText)
            };
            break;
          case 'class':
            tmpDetailSymbol = {
              symbolInformation: SymbolInformation.create(name, SymbolKind.Class, Range.create(Position.create(line, startCharacter), Position.create(line, endCharacter)), undefined, undefined),
              qname: name,
              contents: MarkedString.fromPlainText(hoverText)
            };
            break;
          case 'method':
            tmpDetailSymbol = {
              symbolInformation: SymbolInformation.create(name, SymbolKind.Method, Range.create(Position.create(line, startCharacter), Position.create(line, endCharacter)), undefined, clazz),
              qname: name,
              contents: MarkedString.fromPlainText(hoverText)
            };
            break;
          case 'field':
            tmpDetailSymbol = {
              symbolInformation: SymbolInformation.create(name, SymbolKind.Field, Range.create(Position.create(line, startCharacter), Position.create(line, endCharacter)), undefined, clazz),
              qname: name,
              contents: MarkedString.fromPlainText(hoverText)
            };
            break;
          case 'local':
            tmpDetailSymbol = {
              symbolInformation: SymbolInformation.create(name, SymbolKind.Field, Range.create(Position.create(line, startCharacter), Position.create(line, endCharacter)), undefined, clazz),
              qname: name,
              contents: MarkedString.fromPlainText(hoverText)
            };
            break;
        }
        if (tmpDetailSymbol.qname !== '') {
          detailSymbols.push(tmpDetailSymbol);
        }
      });
    }
    return detailSymbols;
  }
}
