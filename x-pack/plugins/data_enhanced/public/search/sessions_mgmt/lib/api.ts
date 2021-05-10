/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ApplicationStart, NotificationsStart, SavedObject } from 'kibana/public';
import moment from 'moment';
import { from, race, timer } from 'rxjs';
import { mapTo, tap } from 'rxjs/operators';
import type { SharePluginStart } from 'src/plugins/share/public';
import {
  ISessionsClient,
  SearchUsageCollector,
} from '../../../../../../../src/plugins/data/public';
import { SearchSessionStatus } from '../../../../../../../src/plugins/data/common';
import { ACTION } from '../components/actions';
import {
  PersistedSearchSessionSavedObjectAttributes,
  UISearchSessionState,
  UISession,
} from '../types';
import { SessionsConfigSchema } from '..';

type UrlGeneratorsStart = SharePluginStart['urlGenerators'];

function getActions(status: UISearchSessionState) {
  const actions: ACTION[] = [];
  actions.push(ACTION.INSPECT);
  actions.push(ACTION.RENAME);
  if (status === SearchSessionStatus.IN_PROGRESS || status === SearchSessionStatus.COMPLETE) {
    actions.push(ACTION.EXTEND);
    actions.push(ACTION.DELETE);
  }

  if (status === SearchSessionStatus.EXPIRED) {
    actions.push(ACTION.DELETE);
  }

  return actions;
}

/**
 * Status we display on mgtm UI might be different from the one inside the saved object
 * @param status
 */
function getUIStatus(session: PersistedSearchSessionSavedObjectAttributes): UISearchSessionState {
  const isSessionExpired = () => {
    const curTime = moment();
    return curTime.diff(moment(session.expires), 'ms') > 0;
  };

  switch (session.status) {
    case SearchSessionStatus.COMPLETE:
    case SearchSessionStatus.IN_PROGRESS:
      return isSessionExpired() ? SearchSessionStatus.EXPIRED : session.status;
  }

  return session.status;
}

async function getUrlFromState(
  urls: UrlGeneratorsStart,
  urlGeneratorId: string,
  state: Record<string, unknown>
) {
  let url = '/';
  try {
    url = await urls.getUrlGenerator(urlGeneratorId).createUrl(state);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Could not create URL from restoreState');
    // eslint-disable-next-line no-console
    console.error(err);
  }
  return url;
}

// Helper: factory for a function to map server objects to UI objects
const mapToUISession = (urls: UrlGeneratorsStart, config: SessionsConfigSchema) => async (
  savedObject: SavedObject<PersistedSearchSessionSavedObjectAttributes>
): Promise<UISession> => {
  const {
    name,
    appId,
    created,
    expires,
    urlGeneratorId,
    initialState,
    restoreState,
  } = savedObject.attributes;

  const status = getUIStatus(savedObject.attributes);
  const actions = getActions(status);

  // TODO: initialState should be saved without the searchSessionID
  if (initialState) delete initialState.searchSessionId;
  // derive the URL and add it in
  const reloadUrl = await getUrlFromState(urls, urlGeneratorId, initialState);
  const restoreUrl = await getUrlFromState(urls, urlGeneratorId, restoreState);

  return {
    id: savedObject.id,
    name,
    appId,
    created,
    expires,
    status,
    actions,
    restoreUrl,
    reloadUrl,
    initialState,
    restoreState,
  };
};

interface SearchSessionManagementDeps {
  urls: UrlGeneratorsStart;
  notifications: NotificationsStart;
  application: ApplicationStart;
  usageCollector?: SearchUsageCollector;
}

export class SearchSessionsMgmtAPI {
  constructor(
    private sessionsClient: ISessionsClient,
    private config: SessionsConfigSchema,
    private deps: SearchSessionManagementDeps
  ) {}

  public async fetchTableData(): Promise<UISession[]> {
    interface FetchResult {
      saved_objects: object[];
    }

    const mgmtConfig = this.config.management;

    const refreshTimeout = moment.duration(mgmtConfig.refreshTimeout);

    const fetch$ = from(
      this.sessionsClient.find({
        page: 1,
        perPage: mgmtConfig.maxSessions,
        sortField: 'created',
        sortOrder: 'asc',
        searchFields: ['persisted'],
        search: 'true',
      })
    );
    const timeout$ = timer(refreshTimeout.asMilliseconds()).pipe(
      tap(() => {
        this.deps.notifications.toasts.addDanger(
          i18n.translate('xpack.data.mgmt.searchSessions.api.fetchTimeout', {
            defaultMessage: 'Fetching the Search Session info timed out after {timeout} seconds',
            values: { timeout: refreshTimeout.asSeconds() },
          })
        );
      }),
      mapTo(null)
    );

    // fetch the search sessions before timeout triggers
    try {
      const result = await race<FetchResult | null>(fetch$, timeout$).toPromise();
      if (result && result.saved_objects) {
        const savedObjects = result.saved_objects as Array<
          SavedObject<PersistedSearchSessionSavedObjectAttributes>
        >;
        return await Promise.all(savedObjects.map(mapToUISession(this.deps.urls, this.config)));
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      this.deps.notifications.toasts.addError(err, {
        title: i18n.translate('xpack.data.mgmt.searchSessions.api.fetchError', {
          defaultMessage: 'Failed to refresh the page!',
        }),
      });
    }

    return [];
  }

  public reloadSearchSession(reloadUrl: string) {
    this.deps.usageCollector?.trackSessionReloaded();
    this.deps.application.navigateToUrl(reloadUrl);
  }

  public getExtendByDuration() {
    return this.config.defaultExpiration;
  }

  // Cancel and expire
  public async sendCancel(id: string): Promise<void> {
    this.deps.usageCollector?.trackSessionDeleted();
    try {
      await this.sessionsClient.delete(id);

      this.deps.notifications.toasts.addSuccess({
        title: i18n.translate('xpack.data.mgmt.searchSessions.api.deleted', {
          defaultMessage: 'The search session was deleted.',
        }),
      });
    } catch (err) {
      this.deps.notifications.toasts.addError(err, {
        title: i18n.translate('xpack.data.mgmt.searchSessions.api.deletedError', {
          defaultMessage: 'Failed to delete the search session!',
        }),
      });
    }
  }

  // Extend
  public async sendExtend(id: string, expires: string): Promise<void> {
    this.deps.usageCollector?.trackSessionExtended();
    try {
      await this.sessionsClient.extend(id, expires);

      this.deps.notifications.toasts.addSuccess({
        title: i18n.translate('xpack.data.mgmt.searchSessions.api.extended', {
          defaultMessage: 'The search session was extended.',
        }),
      });
    } catch (err) {
      this.deps.notifications.toasts.addError(err, {
        title: i18n.translate('xpack.data.mgmt.searchSessions.api.extendError', {
          defaultMessage: 'Failed to extend the search session!',
        }),
      });
    }
  }

  // Change the user-facing name of a search session
  public async sendRename(id: string, newName: string): Promise<void> {
    try {
      await this.sessionsClient.rename(id, newName);

      this.deps.notifications.toasts.addSuccess({
        title: i18n.translate('xpack.data.mgmt.searchSessions.api.rename', {
          defaultMessage: 'The search session was renamed',
        }),
      });
    } catch (err) {
      this.deps.notifications.toasts.addError(err, {
        title: i18n.translate('xpack.data.mgmt.searchSessions.api.renameError', {
          defaultMessage: 'Failed to rename the search session',
        }),
      });
    }
  }
}
