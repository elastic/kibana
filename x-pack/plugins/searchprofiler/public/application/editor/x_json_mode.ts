/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Copied and modified from src/legacy/core_plugins/console/public/src/sense_editor/mode/input.js

import ace from 'brace';

import * as xJsonRules from './x_json_highlight_rules';
import { workerModule } from './worker';

const oop = ace.acequire('ace/lib/oop');
const { Mode: JSONMode } = ace.acequire('ace/mode/json');
const { Tokenizer: AceTokenizer } = ace.acequire('ace/tokenizer');
const { MatchingBraceOutdent } = ace.acequire('ace/mode/matching_brace_outdent');
const { CstyleBehaviour } = ace.acequire('ace/mode/behaviour/cstyle');
const { FoldMode: CStyleFoldMode } = ace.acequire('ace/mode/folding/cstyle');
const { WorkerClient } = ace.acequire('ace/worker/worker_client');

function XJsonMode(this: any) {
  this.$tokenizer = new AceTokenizer(xJsonRules.getRules());
  this.$outdent = new MatchingBraceOutdent();
  this.$behaviour = new CstyleBehaviour();
  this.foldingRules = new CStyleFoldMode();
}

// Order here matters here:

// 1. We first inherit
oop.inherits(XJsonMode, JSONMode);

// 2. Then clobber `createWorker` method to install our worker source. Per ace's wiki: https://github.com/ajaxorg/ace/wiki/Syntax-validation
XJsonMode.prototype.createWorker = function(session: ace.IEditSession) {
  const xJsonWorker = new WorkerClient(['ace'], workerModule, 'JsonWorker');

  xJsonWorker.attachToDocument(session.getDocument());

  xJsonWorker.on('annotate', function(e: { data: any }) {
    session.setAnnotations(e.data);
  });

  xJsonWorker.on('terminate', function() {
    session.clearAnnotations();
  });

  return xJsonWorker;
};

export function installXJsonMode(editor: ace.Editor) {
  const session = editor.getSession();
  session.setMode(new (XJsonMode as any)());
}
