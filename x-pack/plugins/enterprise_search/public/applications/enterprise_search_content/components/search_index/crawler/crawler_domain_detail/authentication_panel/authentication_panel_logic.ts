/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { CrawlerAuth } from '../../../../../api/crawler/types';
import { isRawCrawlerAuth, isBasicCrawlerAuth } from '../../../../../api/crawler/utils';
import {
  CrawlerDomainDetailActions,
  CrawlerDomainDetailLogic,
} from '../crawler_domain_detail_logic';

interface AuthenticationPanelValues {
  headerContent: string;
  isEditing: boolean;
  isModalVisible: boolean;
  password: string;
  selectedAuthOption: string | null;
  username: string;
}

type AuthenticationPanelActions = {
  deleteCredentials(): void;
  disableEditing(): void;
  enableEditing(currentCrawlerAuth?: CrawlerAuth): { currentCrawlerAuth: CrawlerAuth | undefined };
  saveCredentials(): void;
  selectAuthOption(authType: string): { authType: string };
  setHeaderContent(headerContent: string): { headerContent: string };
  setIsModalVisible(isModalVisible: boolean): { isModalVisible: boolean };
  setPassword(password: string): { password: string };
  setUsername(username: string): { username: string };
} & Pick<CrawlerDomainDetailActions, 'submitAuthUpdate' | 'receiveDomainData'>;

export const AuthenticationPanelLogic = kea<
  MakeLogicType<AuthenticationPanelValues, AuthenticationPanelActions>
>({
  path: ['enterprise_search', 'app_search', 'crawler', 'authentication_panel'],
  connect: {
    actions: [CrawlerDomainDetailLogic, ['submitAuthUpdate', 'receiveDomainData']],
  },
  actions: () => ({
    deleteCredentials: true,
    disableEditing: true,
    enableEditing: (currentCrawlerAuth) => ({ currentCrawlerAuth }),
    saveCredentials: true,
    selectAuthOption: (authType) => ({ authType }),
    setHeaderContent: (headerContent) => ({ headerContent }),
    setIsModalVisible: (isModalVisible) => ({ isModalVisible }),
    setPassword: (password) => ({ password }),
    setUsername: (username) => ({ username }),
  }),
  reducers: () => ({
    headerContent: [
      '',
      {
        // @ts-expect-error upgrade typescript v5.1.6
        enableEditing: (_, { currentCrawlerAuth }) =>
          currentCrawlerAuth !== undefined && isRawCrawlerAuth(currentCrawlerAuth)
            ? currentCrawlerAuth.header
            : '',
        receiveDomainData: () => '',
        // @ts-expect-error upgrade typescript v5.1.6
        setHeaderContent: (_, { headerContent }) => headerContent,
      },
    ],
    isEditing: [
      false,
      {
        disableEditing: () => false,
        enableEditing: () => true,
        receiveDomainData: () => false,
      },
    ],
    isModalVisible: [
      false,
      {
        receiveDomainData: () => false,
        // @ts-expect-error upgrade typescript v5.1.6
        setIsModalVisible: (_, { isModalVisible }) => isModalVisible,
      },
    ],
    password: [
      '',
      {
        // @ts-expect-error upgrade typescript v5.1.6
        enableEditing: (_, { currentCrawlerAuth }) =>
          currentCrawlerAuth !== undefined && isBasicCrawlerAuth(currentCrawlerAuth)
            ? currentCrawlerAuth.password
            : '',
        receiveDomainData: () => '',
        // @ts-expect-error upgrade typescript v5.1.6
        setPassword: (_, { password }) => password,
      },
    ],
    selectedAuthOption: [
      null,
      {
        // @ts-expect-error upgrade typescript v5.1.6
        enableEditing: (_, { currentCrawlerAuth }) => currentCrawlerAuth?.type ?? 'basic',
        receiveDomainData: () => null,
        // @ts-expect-error upgrade typescript v5.1.6
        selectAuthOption: (_, { authType }) => authType,
      },
    ],
    username: [
      '',
      {
        // @ts-expect-error upgrade typescript v5.1.6
        enableEditing: (_, { currentCrawlerAuth }) =>
          currentCrawlerAuth !== undefined && isBasicCrawlerAuth(currentCrawlerAuth)
            ? currentCrawlerAuth.username
            : '',
        receiveDomainData: () => '',
        // @ts-expect-error upgrade typescript v5.1.6
        setUsername: (_, { username }) => username,
      },
    ],
  }),
  listeners: ({ values }) => ({
    saveCredentials: () => {
      const { headerContent, password, selectedAuthOption, username } = values;
      if (selectedAuthOption === 'basic') {
        CrawlerDomainDetailLogic.actions.submitAuthUpdate({
          password,
          type: 'basic',
          username,
        });
      } else if (selectedAuthOption === 'raw') {
        CrawlerDomainDetailLogic.actions.submitAuthUpdate({
          header: headerContent,
          type: 'raw',
        });
      }
    },
    deleteCredentials: () => {
      CrawlerDomainDetailLogic.actions.submitAuthUpdate(null);
    },
  }),
});
