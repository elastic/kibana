/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compressToEncodedURIComponent } from 'lz-string';
import { FtrProviderContext } from '../ftr_provider_context';

export function SearchProfilerPageProvider({ getService }: FtrProviderContext) {
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const monacoEditor = getService('monacoEditor');
  const editorTestSubjectSelector = 'searchProfilerEditor';

  return {
    async editorExists() {
      return await testSubjects.exists(editorTestSubjectSelector);
    },
    async setQuery(query: any) {
      await monacoEditor.setCodeEditorValue(JSON.stringify(query), 0);
    },
    async getQuery() {
      return JSON.parse(await monacoEditor.getCodeEditorValue(0));
    },
    async setIndexName(indexName: string) {
      await testSubjects.setValue('indexName', indexName);
    },
    async getIndexName() {
      const indexInput = await testSubjects.find('indexName');
      return await indexInput.getAttribute('value');
    },
    async clickProfileButton() {
      await testSubjects.click('profileButton');
    },
    async getProfileContent() {
      const profileTree = await find.byClassName('prfDevTool__main__profiletree');
      // const profileTree = await find.byClassName('prfDevTool__page');
      return profileTree.getVisibleText();
    },
    getUrlWithIndexAndQuery({ indexName, query }: { indexName: string; query: any }) {
      const searchQueryURI = compressToEncodedURIComponent(JSON.stringify(query, null, 2));
      return `/searchprofiler?index=${indexName}&load_from=${searchQueryURI}`;
    },
    async editorHasParseErrors() {
      return await monacoEditor.getCurrentMarkers(editorTestSubjectSelector);
    },
    async editorHasErrorNotification() {
      const notification = await testSubjects.find('noShardsNotification');
      const text = await notification.getVisibleText();
      return text.includes('Unable to profile');
    },
  };
}
