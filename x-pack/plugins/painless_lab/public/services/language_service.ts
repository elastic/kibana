/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// It is important that we use this specific monaco instance so that
// editor settings are registered against the instance our React component
// uses.
import { monaco } from '@kbn/monaco';

// @ts-ignore
import workerSrc from 'raw-loader!monaco-editor/min/vs/base/worker/workerMain.js';

import { monacoPainlessLang } from '../lib';

const LANGUAGE_ID = 'painless';

// Safely check whether these globals are present
const CAN_CREATE_WORKER = typeof Blob === 'function' && typeof Worker === 'function';

export class LanguageService {
  private originalMonacoEnvironment: any;

  public setup() {
    monaco.languages.register({ id: LANGUAGE_ID });
    monaco.languages.setMonarchTokensProvider(LANGUAGE_ID, monacoPainlessLang);

    if (CAN_CREATE_WORKER) {
      this.originalMonacoEnvironment = (window as any).MonacoEnvironment;
      (window as any).MonacoEnvironment = {
        getWorker: () => {
          const blob = new Blob([workerSrc], { type: 'application/javascript' });
          return new Worker(window.URL.createObjectURL(blob));
        },
      };
    }
  }

  public stop() {
    if (CAN_CREATE_WORKER) {
      (window as any).MonacoEnvironment = this.originalMonacoEnvironment;
    }
  }
}
