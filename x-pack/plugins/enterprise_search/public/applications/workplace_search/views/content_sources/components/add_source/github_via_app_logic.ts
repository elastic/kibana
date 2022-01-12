/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { flashAPIErrors, flashSuccessToast } from '../../../../../shared/flash_messages';
import { HttpLogic } from '../../../../../shared/http';
import { KibanaLogic } from '../../../../../shared/kibana';
import { AppLogic } from '../../../../app_logic';
import {
  GITHUB_VIA_APP_SERVICE_TYPE,
  GITHUB_ENTERPRISE_SERVER_VIA_APP_SERVICE_TYPE,
} from '../../../../constants';
import { SOURCES_PATH, getSourcesPath } from '../../../../routes';
import { ContentSourceFullData } from '../../../../types';

interface GithubViaAppValues {
  githubAppId: string;
  githubEnterpriseServerUrl: string;
  stagedPrivateKey: string | null;
  isSubmitButtonLoading: boolean;
  indexPermissionsValue: boolean;
}

interface GithubViaAppActions {
  setGithubAppId(githubAppId: string): string;
  setGithubEnterpriseServerUrl(githubEnterpriseServerUrl: string): string;
  setStagedPrivateKey(stagedPrivateKey: string | null): string | null;
  setButtonNotLoading(): void;
  createContentSource(isGithubEnterpriseServer: boolean): boolean;
  setSourceIndexPermissionsValue(indexPermissionsValue: boolean): boolean;
}

export const GithubViaAppLogic = kea<MakeLogicType<GithubViaAppValues, GithubViaAppActions>>({
  path: ['enterprise_search', 'workplace_search', 'github_via_app_logic'],
  actions: {
    setGithubAppId: (githubAppId: string) => githubAppId,
    setGithubEnterpriseServerUrl: (githubEnterpriseServerUrl: string) => githubEnterpriseServerUrl,
    createContentSource: (isGithubEnterpriseServer: boolean) => isGithubEnterpriseServer,
    setStagedPrivateKey: (stagedPrivateKey: string) => stagedPrivateKey,
    setButtonNotLoading: false,
    setSourceIndexPermissionsValue: (indexPermissionsValue: boolean) => indexPermissionsValue,
  },
  reducers: {
    githubAppId: [
      '',
      {
        setGithubAppId: (_, githubAppId) => githubAppId,
      },
    ],
    githubEnterpriseServerUrl: [
      '',
      {
        setGithubEnterpriseServerUrl: (_, githubEnterpriseServerUrl) => githubEnterpriseServerUrl,
      },
    ],
    stagedPrivateKey: [
      null,
      {
        setStagedPrivateKey: (_, stagedPrivateKey) => stagedPrivateKey,
      },
    ],
    isSubmitButtonLoading: [
      false,
      {
        createContentSource: () => true,
        setButtonNotLoading: () => false,
      },
    ],
    indexPermissionsValue: [
      true,
      {
        setSourceIndexPermissionsValue: (_, indexPermissionsValue) => indexPermissionsValue,
        resetSourceState: () => false,
      },
    ],
  },
  listeners: ({ actions, values }) => ({
    createContentSource: async (isGithubEnterpriseServer) => {
      const { isOrganization } = AppLogic.values;
      const route = isOrganization
        ? '/internal/workplace_search/org/create_source'
        : '/internal/workplace_search/account/create_source';

      const { githubAppId, githubEnterpriseServerUrl, stagedPrivateKey, indexPermissionsValue } =
        values;

      const params = {
        service_type: isGithubEnterpriseServer
          ? GITHUB_ENTERPRISE_SERVER_VIA_APP_SERVICE_TYPE
          : GITHUB_VIA_APP_SERVICE_TYPE,
        app_id: githubAppId,
        base_url: githubEnterpriseServerUrl,
        private_key: stagedPrivateKey,
        index_permissions: indexPermissionsValue,
      };

      try {
        const response = await HttpLogic.values.http.post<ContentSourceFullData>(route, {
          body: JSON.stringify({ ...params }),
        });

        KibanaLogic.values.navigateToUrl(`${getSourcesPath(SOURCES_PATH, isOrganization)}`);
        flashSuccessToast(`${response.serviceName} connected`);
      } catch (e) {
        flashAPIErrors(e);
      } finally {
        actions.setButtonNotLoading();
      }
    },
  }),
});
