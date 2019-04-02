/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { editor } from 'monaco-editor';
import queryString from 'querystring';
import { parseSchema } from '../../../common/uri_util';
import { history } from '../../utils/url';

export function registerReferencesAction(e: editor.IStandaloneCodeEditor) {
  e.addAction({
    id: 'editor.action.referenceSearch.trigger',
    label: 'Find All References',
    contextMenuGroupId: 'navigation',
    contextMenuOrder: 1.5,
    run(ed: editor.ICodeEditor) {
      const position = ed.getPosition();
      const { uri } = parseSchema(ed.getModel().uri.toString());
      const refUrl = `git:/${uri}!L${position.lineNumber - 1}:${position.column - 1}`;
      const queries = queryString.parse(location.search);
      const query = queryString.stringify({
        ...queries,
        tab: 'references',
        refUrl,
      });
      history.push(`${uri}?${query}`);
    },
  });
}
