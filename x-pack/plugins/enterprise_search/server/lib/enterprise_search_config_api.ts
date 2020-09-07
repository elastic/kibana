/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import AbortController from 'abort-controller';
import fetch from 'node-fetch';

import { KibanaRequest, Logger } from 'src/core/server';
import { ConfigType } from '../';
import { IAccess } from './check_access';

import { IInitialAppData } from '../../common/types';
import { stripTrailingSlash } from '../../common/strip_trailing_slash';

interface IParams {
  request: KibanaRequest;
  config: ConfigType;
  log: Logger;
}
interface IReturn extends IInitialAppData {
  access?: IAccess;
  publicUrl?: string;
}

/**
 * Calls an internal Enterprise Search API endpoint which returns
 * useful various settings (e.g. product access, external URL)
 * needed by the Kibana plugin at the setup stage
 */
const ENDPOINT = '/api/ent/v1/internal/client_config';

export const callEnterpriseSearchConfigAPI = async ({
  config,
  log,
  request,
}: IParams): Promise<IReturn> => {
  if (!config.host) return {};

  const TIMEOUT_WARNING = `Enterprise Search access check took over ${config.accessCheckTimeoutWarning}ms. Please ensure your Enterprise Search server is respondingly normally and not adversely impacting Kibana load speeds.`;
  const TIMEOUT_MESSAGE = `Exceeded ${config.accessCheckTimeout}ms timeout while checking ${config.host}. Please consider increasing your enterpriseSearch.accessCheckTimeout value so that users aren't prevented from accessing Enterprise Search plugins due to slow responses.`;
  const CONNECTION_ERROR = 'Could not perform access check to Enterprise Search';

  const warningTimeout = setTimeout(() => {
    log.warn(TIMEOUT_WARNING);
  }, config.accessCheckTimeoutWarning);

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, config.accessCheckTimeout);

  try {
    const enterpriseSearchUrl = encodeURI(`${config.host}${ENDPOINT}`);
    const response = await fetch(enterpriseSearchUrl, {
      headers: { Authorization: request.headers.authorization as string },
      signal: controller.signal,
    });
    const data = await response.json();

    return {
      access: {
        hasAppSearchAccess: !!data?.current_user?.access?.app_search,
        hasWorkplaceSearchAccess: !!data?.current_user?.access?.workplace_search,
      },
      publicUrl: stripTrailingSlash(data?.settings?.external_url),
      readOnlyMode: !!data?.settings?.read_only_mode,
      ilmEnabled: !!data?.settings?.ilm_enabled,
      configuredLimits: {
        maxDocumentByteSize: data?.settings?.configured_limits?.max_document_byte_size,
        maxEnginesPerMetaEngine: data?.settings?.configured_limits?.max_engines_per_meta_engine,
      },
      appSearch: {
        accountId: data?.settings?.app_search?.account_id,
        onBoardingComplete: !!data?.settings?.app_search?.onboarding_complete,
        role: {
          id: data?.current_user?.app_search_role?.id,
          roleType: data?.current_user?.app_search_role?.role_type,
          ability: {
            accessAllEngines: !!data?.current_user?.app_search_role?.ability?.access_all_engines,
            destroy: data?.current_user?.app_search_role?.ability?.destroy || [],
            manage: data?.current_user?.app_search_role?.ability?.manage || [],
            edit: data?.current_user?.app_search_role?.ability?.edit || [],
            view: data?.current_user?.app_search_role?.ability?.view || [],
            credentialTypes: data?.current_user?.app_search_role?.ability?.credential_types || [],
            availableRoleTypes:
              data?.current_user?.app_search_role?.ability?.available_role_types || [],
          },
        },
      },
      workplaceSearch: {
        canCreateInvitations: !!data?.settings?.workplace_search?.can_create_invitations,
        isFederatedAuth: !!data?.settings?.workplace_search?.is_federated_auth,
        organization: {
          name: data?.settings?.workplace_search?.organization?.name,
          defaultOrgName: data?.settings?.workplace_search?.organization?.default_org_name,
        },
        fpAccount: {
          id: data?.settings?.workplace_search?.fp_account.id,
          groups: data?.settings?.workplace_search?.fp_account.groups || [],
          isAdmin: !!data?.settings?.workplace_search?.fp_account?.is_admin,
          canCreatePersonalSources: !!data?.settings?.workplace_search?.fp_account
            ?.can_create_personal_sources,
          isCurated: !!data?.settings?.workplace_search?.fp_account.is_curated,
          viewedOnboardingPage: !!data?.settings?.workplace_search?.fp_account
            .viewed_onboarding_page,
        },
      },
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      log.warn(TIMEOUT_MESSAGE);
    } else {
      log.error(`${CONNECTION_ERROR}: ${err.toString()}`);
      if (err instanceof Error) log.debug(err.stack as string);
    }
    return {};
  } finally {
    clearTimeout(warningTimeout);
    clearTimeout(timeout);
  }
};
