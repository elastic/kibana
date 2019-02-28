/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ace from 'ace';
import 'brace/ext/language_tools';

const splitTokens = (line) => {
  return line.split(/\s+/);
};
const wordCompleter = words => {
  return {
    identifierRegexps: [
      /[a-zA-Z_0-9\.\$\-\u00A2-\uFFFF]/ // adds support for dot character
    ],
    getCompletions: (editor, session, pos, prefix, callback) => {
      const document = session.getDocument();
      const currentLine = document.getLine(pos.row);
      const previousLine = document.getLine(pos.row - 1);
      const currentTokens = splitTokens(currentLine.slice(0, pos.column));
      const fullLineTokens = splitTokens(currentLine);
      const isInArray = previousLine && splitTokens(previousLine).slice(-1)[0] === '[';
      const [ , secondToken = null ] = currentTokens;
      const [ , secondFullToken = null ] = fullLineTokens;
      if (isInArray || currentTokens.length > 2) {
        return callback(null, []);
      }
      const startQuote = secondToken === '"' ? '' : '"';
      const endQuote = secondFullToken === '""' ? '' : '"';
      callback(
        null,
        words.map(word => {
          return {
            caption: ` ${word}`,
            value: `${startQuote}${word}${endQuote}`
          };
        })
      );
    }
  };
};

export const createAceEditor = (
  div,
  value,
  readOnly = true,
  autocompleteArray
) => {
  const editor = ace.edit(div);
  editor.$blockScrolling = Infinity;
  editor.setValue(value, -1);
  const session = editor.getSession();
  session.setUseWrapMode(true);
  session.setMode('ace/mode/json');
  if (autocompleteArray) {
    const languageTools = ace.acequire('ace/ext/language_tools');
    const autocompleter = wordCompleter(autocompleteArray);
    languageTools.setCompleters([autocompleter]);
  }
  const options = {
    readOnly,
    highlightActiveLine: false,
    highlightGutterLine: false,
    minLines: 20,
    maxLines: 30
  };
  //done this way to avoid warnings about unrecognized options
  const autocompleteOptions = (readOnly) ? {} : {
    enableBasicAutocompletion: true,
    enableLiveAutocompletion: true
  };
  editor.setOptions({ ...options, ...autocompleteOptions });
  editor.setBehavioursEnabled(!readOnly);
  return editor;
};
