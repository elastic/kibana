/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ace from 'brace';
import { XJsonMode } from '../../../../../../../src/plugins/es_ui_shared/console_lang';
import { workerModule } from './worker';
const { WorkerClient } = ace.acequire('ace/worker/worker_client');

// Then clobber `createWorker` method to install our worker source. Per ace's wiki: https://github.com/ajaxorg/ace/wiki/Syntax-validation
(XJsonMode.prototype as any).createWorker = function(session: ace.IEditSession) {
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

export { XJsonMode };

export function installXJsonMode(editor: ace.Editor) {
  const session = editor.getSession();
  session.setMode(new (XJsonMode as any)());
}
