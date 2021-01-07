/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import AbortController from 'abort-controller';
import fetch from 'node-fetch';

import { KibanaRequest, Logger } from 'src/core/server';
import { ConfigType } from '../';
import { Access } from './check_access';

import { InitialAppData } from '../../common/types';
import { stripTrailingSlash } from '../../common/strip_slashes';

interface Params {
  request: KibanaRequest;
  config: ConfigType;
  log: Logger;
}
interface Return extends InitialAppData {
  access?: Access;
  publicUrl?: string;
}

/**
 * Calls an internal Enterprise Search API endpoint which returns
 * useful various settings (e.g. product access, external URL)
 * needed by the Kibana plugin at the setup stage
 */
const ENDPOINT = '/api/ent/v2/internal/client_config';

export const callEnterpriseSearchConfigAPI = async ({
  config,
  log,
  request,
}: Params): Promise<Return> => {
  if (!config.host) return {};

  const TIMEOUT_WARNING = `Enterprise Search access check took over ${config.accessCheckTimeoutWarning}ms. Please ensure your Enterprise Search server is responding normally and not adversely impacting Kibana load speeds.`;
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
      isFederatedAuth: !!data?.settings?.is_federated_auth, // i.e., not standard auth
      configuredLimits: {
        appSearch: {
          engine: {
            maxDocumentByteSize:
              data?.settings?.configured_limits?.app_search?.engine?.document_size_in_bytes,
            maxEnginesPerMetaEngine:
              data?.settings?.configured_limits?.app_search?.engine?.source_engines_per_meta_engine,
          },
        },
        workplaceSearch: {
          customApiSource: {
            maxDocumentByteSize:
              data?.settings?.configured_limits?.workplace_search?.custom_api_source
                ?.document_size_in_bytes,
            totalFields:
              data?.settings?.configured_limits?.workplace_search?.custom_api_source?.total_fields,
          },
        },
      },
      appSearch: {
        accountId: data?.current_user?.app_search?.account?.id,
        onboardingComplete: !!data?.current_user?.app_search?.account?.onboarding_complete,
        role: {
          id: data?.current_user?.app_search?.role?.id,
          roleType: data?.current_user?.app_search?.role?.role_type,
          ability: {
            accessAllEngines: !!data?.current_user?.app_search?.role?.ability?.access_all_engines,
            manage: data?.current_user?.app_search?.role?.ability?.manage || [],
            edit: data?.current_user?.app_search?.role?.ability?.edit || [],
            view: data?.current_user?.app_search?.role?.ability?.view || [],
            credentialTypes: data?.current_user?.app_search?.role?.ability?.credential_types || [],
            availableRoleTypes:
              data?.current_user?.app_search?.role?.ability?.available_role_types || [],
          },
        },
      },
      workplaceSearch: {
        organization: {
          name: data?.current_user?.workplace_search?.organization?.name,
          defaultOrgName: data?.current_user?.workplace_search?.organization?.default_org_name,
        },
        account: {
          id: data?.current_user?.workplace_search?.account?.id,
          groups: data?.current_user?.workplace_search?.account?.groups || [],
          isAdmin: !!data?.current_user?.workplace_search?.account?.is_admin,
          canCreatePersonalSources: !!data?.current_user?.workplace_search?.account
            ?.can_create_personal_sources,
          canCreateInvitations: !!data?.current_user?.workplace_search?.account
            ?.can_create_invitations,
          isCurated: !!data?.current_user?.workplace_search?.account?.is_curated,
          viewedOnboardingPage: !!data?.current_user?.workplace_search?.account
            ?.viewed_onboarding_page,
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
