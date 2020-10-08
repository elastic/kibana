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

import {
  getPainlessClassToAutocomplete,
  painlessTypes,
  getPainlessClassesToAutocomplete,
} from './autocomplete_utils';

const LANGUAGE_ID = 'painless';

// Safely check whether these globals are present
const CAN_CREATE_WORKER = typeof Blob === 'function' && typeof Worker === 'function';

export class LanguageService {
  private originalMonacoEnvironment: any;

  public setup() {
    monaco.languages.register({ id: LANGUAGE_ID });
    monaco.languages.setMonarchTokensProvider(LANGUAGE_ID, monacoPainlessLang);

    monaco.languages.registerCompletionItemProvider(LANGUAGE_ID, {
      triggerCharacters: ['.'],
      provideCompletionItems(model, position) {
        // Active line characters, e.g., "boolean isInCircle"
        const activeCharacters = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 0,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        // Array of the active line words, e.g., [boolean, isInCircle]
        const words = activeCharacters.replace('\t', '').split(' ');
        // What the user is currently typing
        const activeTyping = words[words.length - 1];
        // If the active typing contains dot notation, we assume we need to access the object's properties
        const isProperty = activeTyping.split('.').length === 2;
        // If the active typing contains a type, we skip autocomplete, e.g., "boolean"
        const isType = words.length === 2 && painlessTypes.includes(words[0]);

        let autocompleteSuggestions: monaco.languages.CompletionItem[] = [];

        if (isProperty) {
          const className = activeTyping.substring(0, activeTyping.length - 1).split('.')[0];

          autocompleteSuggestions = getPainlessClassToAutocomplete(className, range);
        } else {
          if (!isType) {
            autocompleteSuggestions = getPainlessClassesToAutocomplete(range);
          }
        }

        return {
          incomplete: true,
          suggestions: autocompleteSuggestions,
        };
      },
    });

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
