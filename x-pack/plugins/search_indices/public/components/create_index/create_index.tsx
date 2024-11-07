/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';

import type { IndicesStatusResponse, UserStartPrivilegesResponse } from '../../../common';

import { AnalyticsEvents } from '../../analytics/constants';
import { AvailableLanguages } from '../../code_examples';
import { useKibana } from '../../hooks/use_kibana';
import { useUsageTracker } from '../../hooks/use_usage_tracker';
import { CreateIndexFormState } from '../../types';
import { generateRandomIndexName } from '../../utils/indices';
import { getDefaultCodingLanguage } from '../../utils/language';

import { CreateIndexPanel } from '../shared/create_index_panel';

import { CreateIndexCodeView } from './create_index_code_view';
import { CreateIndexUIView } from './create_index_ui_view';

function initCreateIndexState() {
  const defaultIndexName = generateRandomIndexName();
  return {
    indexName: defaultIndexName,
    defaultIndexName,
    codingLanguage: getDefaultCodingLanguage(),
  };
}

export interface CreateIndexProps {
  indicesData?: IndicesStatusResponse;
  userPrivileges?: UserStartPrivilegesResponse;
}

enum CreateIndexViewMode {
  UI = 'ui',
  Code = 'code',
}

export const CreateIndex = ({ indicesData, userPrivileges }: CreateIndexProps) => {
  const { application } = useKibana().services;
  const [createIndexView, setCreateIndexView] = useState<CreateIndexViewMode>(
    userPrivileges?.privileges.canCreateIndex === false
      ? CreateIndexViewMode.Code
      : CreateIndexViewMode.UI
  );
  const [formState, setFormState] = useState<CreateIndexFormState>(initCreateIndexState);
  const usageTracker = useUsageTracker();
  const onChangeView = useCallback(
    (id: string) => {
      switch (id) {
        case CreateIndexViewMode.UI:
          usageTracker.click(AnalyticsEvents.createIndexShowUIClick);
          setCreateIndexView(CreateIndexViewMode.UI);
          return;
        case CreateIndexViewMode.Code:
          usageTracker.click(AnalyticsEvents.createIndexShowCodeClick);
          setCreateIndexView(CreateIndexViewMode.Code);
          return;
      }
    },
    [usageTracker]
  );
  const onChangeCodingLanguage = useCallback(
    (language: AvailableLanguages) => {
      setFormState({
        ...formState,
        codingLanguage: language,
      });
      usageTracker.count([
        AnalyticsEvents.createIndexLanguageSelect,
        `${AnalyticsEvents.createIndexLanguageSelect}_${language}`,
      ]);
    },
    [usageTracker, formState, setFormState]
  );
  const onClose = useCallback(() => {
    application.navigateToApp('management', { deepLinkId: 'index_management' });
  }, [application]);

  return (
    <CreateIndexPanel
      createIndexView={createIndexView}
      onChangeView={onChangeView}
      onClose={onClose}
    >
      {createIndexView === CreateIndexViewMode.UI && (
        <CreateIndexUIView
          formState={formState}
          setFormState={setFormState}
          userPrivileges={userPrivileges}
        />
      )}
      {createIndexView === CreateIndexViewMode.Code && (
        <CreateIndexCodeView
          indicesData={indicesData}
          selectedLanguage={formState.codingLanguage}
          indexName={formState.indexName}
          changeCodingLanguage={onChangeCodingLanguage}
          canCreateApiKey={userPrivileges?.privileges.canCreateApiKeys}
          analyticsEvents={{
            runInConsole: AnalyticsEvents.createIndexRunInConsole,
            installCommands: AnalyticsEvents.createIndexCodeCopyInstall,
            createIndex: AnalyticsEvents.createIndexCodeCopy,
          }}
        />
      )}
    </CreateIndexPanel>
  );
};
