/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

interface BasicCrawlerAuth {
  password: string;
  type: 'basic';
  username: string;
}

interface RawCrawlerAuth {
  header: string;
  type: 'raw';
}

export type CrawlerAuth = BasicCrawlerAuth | RawCrawlerAuth;

export function isBasicCrawlerAuth(auth: CrawlerAuth): auth is BasicCrawlerAuth {
  return (auth as BasicCrawlerAuth).type === 'basic';
}

export function isRawCrawlerAuth(auth: CrawlerAuth): auth is RawCrawlerAuth {
  return (auth as RawCrawlerAuth).type === 'raw';
}

interface AuthenticationPanelValues {
  headerContent: string;
  isEditing: boolean;
  password: string;
  selectedAuthOption: string | null;
  username: string;
}

interface AuthenticationPanelActions {
  disableEditing(): void;
  enableEditing(currentCrawlerAuth?: CrawlerAuth): { currentCrawlerAuth: CrawlerAuth | undefined };
  selectAuthOption(authType: string): { authType: string };
  setHeaderContent(headerContent: string): { headerContent: string };
  setPassword(password: string): { password: string };
  setUsername(username: string): { username: string };
}

export const AuthenticationPanelLogic = kea<
  MakeLogicType<AuthenticationPanelValues, AuthenticationPanelActions>
>({
  path: ['enterprise_search', 'app_search', 'crawler', 'authentication_panel'],
  actions: () => ({
    disableEditing: true,
    enableEditing: (currentCrawlerAuth) => ({ currentCrawlerAuth }),
    selectAuthOption: (authType) => ({ authType }),
    setHeaderContent: (headerContent) => ({ headerContent }),
    setPassword: (password) => ({ password }),
    setUsername: (username) => ({ username }),
  }),
  reducers: () => ({
    headerContent: [
      '',
      {
        enableEditing: (_, { currentCrawlerAuth }) =>
          currentCrawlerAuth !== undefined && isRawCrawlerAuth(currentCrawlerAuth)
            ? currentCrawlerAuth.header
            : '',
        setHeaderContent: (_, { headerContent }) => headerContent,
      },
    ],
    isEditing: [
      false,
      {
        disableEditing: () => false,
        enableEditing: () => true,
      },
    ],
    password: [
      '',
      {
        enableEditing: (_, { currentCrawlerAuth }) =>
          currentCrawlerAuth !== undefined && isBasicCrawlerAuth(currentCrawlerAuth)
            ? currentCrawlerAuth.password
            : '',
        setPassword: (_, { password }) => password,
      },
    ],
    selectedAuthOption: [
      null,
      {
        enableEditing: (_, { currentCrawlerAuth }) => currentCrawlerAuth?.type ?? 'basic',
        selectAuthOption: (_, { authType }) => authType,
      },
    ],
    username: [
      '',
      {
        enableEditing: (_, { currentCrawlerAuth }) =>
          currentCrawlerAuth !== undefined && isBasicCrawlerAuth(currentCrawlerAuth)
            ? currentCrawlerAuth.username
            : '',
        setUsername: (_, { username }) => username,
      },
    ],
  }),
});
