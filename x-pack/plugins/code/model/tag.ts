/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class Tag {
  line: number;
  symbol: string;
  type: string;
  text: string;
  lineStart: number;
  lineEnd: number;
  clazz?: string;
  namespace?: string;
  signature?: string;

  constructor (line: number, symbol: string, type: string, text: string, namespace: string, signature: string, lineStart: number, lineEnd: number, clazz: string) {
    this.line = line;
    this.symbol = symbol;
    this.type = type;
    this.text = text;
    this.namespace = namespace;
    this.signature = signature;
    this.lineStart = lineStart;
    this.lineEnd = lineEnd;
    this.clazz = clazz;
  }
}

export enum TagFields {
  CLASS = 'class',
  LINE = 'line',
  SIGNATURE = 'signature'
}
