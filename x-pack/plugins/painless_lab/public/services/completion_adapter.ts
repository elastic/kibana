/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { monaco } from '@kbn/monaco';

import {
  getPainlessClassToAutocomplete,
  painlessTypes,
  getPainlessClassesToAutocomplete,
  getPainlessConstructorsToAutocomplete,
} from './autocomplete_utils';

export class PainlessCompletionAdapter implements monaco.languages.CompletionItemProvider {
  // constructor(private _worker: WorkerAccessor) {}

  public get triggerCharacters(): string[] {
    return ['.'];
  }

  provideCompletionItems(
    model: monaco.editor.IReadOnlyModel,
    position: monaco.Position,
    context: monaco.languages.CompletionContext,
    token: monaco.CancellationToken
  ): Promise<monaco.languages.CompletionList> {
    // Active *line* characters, e.g., "boolean isInCircle"
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
    const hasDeclaredType = words.length === 2 && painlessTypes.includes(words[0]);
    const isConstructor = words[words.length - 2] === 'new';

    let autocompleteSuggestions: monaco.languages.CompletionItem[] = [];

    if (isConstructor) {
      autocompleteSuggestions = getPainlessConstructorsToAutocomplete(range);
    } else if (isProperty) {
      const className = activeTyping.substring(0, activeTyping.length - 1).split('.')[0];

      autocompleteSuggestions = getPainlessClassToAutocomplete(className, range);
    } else {
      // If the preceding word is a type, e.g., "boolean", we assume the user is declaring a variable and skip autocomplete
      if (!hasDeclaredType) {
        autocompleteSuggestions = getPainlessClassesToAutocomplete(range);
      }
    }

    return Promise.resolve({
      isIncomplete: false,
      suggestions: autocompleteSuggestions,
    });
  }
}
