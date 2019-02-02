/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Range } from 'monaco-editor';
import { createAction } from 'redux-actions';
import { Hover, Position, TextDocumentPositionParams } from 'vscode-languageserver';

export interface ReferenceResults {
  repos: GroupedRepoReferences[];
  title: string;
}

export interface GroupedRepoReferences {
  repo: string;
  files: GroupedFileReferences[];
}

export interface GroupedFileReferences {
  uri: string;
  file: string;
  language: string;
  code: string;
  lineNumbers: string[];
  repo: string;
  revision: string;
  highlights: Range[];
}

export const findReferences = createAction<TextDocumentPositionParams>('FIND REFERENCES');
export const findReferencesSuccess = createAction<ReferenceResults>('FIND REFERENCES SUCCESS');
export const findReferencesFailed = createAction<Error>('FIND REFERENCES ERROR');
export const closeReferences = createAction<boolean>('CLOSE REFERENCES');
export const hoverResult = createAction<Hover>('HOVER RESULT');
export const revealPosition = createAction<Position | undefined>('REVEAL POSITION');
