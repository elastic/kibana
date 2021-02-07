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
import { ISessionsClient } from '../../../../../../../src/plugins/data/public';
import { SearchSessionStatus } from '../../../../common/search';
import { ACTION } from '../components/actions';
import { PersistedSearchSessionSavedObjectAttributes, UISession } from '../types';
import { SessionsConfigSchema } from '..';

type UrlGeneratorsStart = SharePluginStart['urlGenerators'];

function getActions(status: SearchSessionStatus) {
  const actions: ACTION[] = [];
  actions.push(ACTION.INFO);
  if (status === SearchSessionStatus.IN_PROGRESS || status === SearchSessionStatus.COMPLETE) {
    actions.push(ACTION.EXTEND);
    actions.push(ACTION.DELETE);
  }
  return actions;
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
    status,
    urlGeneratorId,
    initialState,
    restoreState,
  } = savedObject.attributes;

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

interface SearcgSessuibManagementDeps {
  urls: UrlGeneratorsStart;
  notifications: NotificationsStart;
  application: ApplicationStart;
}

export class SearchSessionsMgmtAPI {
  constructor(
    private sessionsClient: ISessionsClient,
    private config: SessionsConfigSchema,
    private deps: SearcgSessuibManagementDeps
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
    this.deps.application.navigateToUrl(reloadUrl);
  }

  public getExtendByDuration() {
    return this.config.defaultExpiration;
  }

  // Cancel and expire
  public async sendCancel(id: string): Promise<void> {
    try {
      await this.sessionsClient.delete(id);

      this.deps.notifications.toasts.addSuccess({
        title: i18n.translate('xpack.data.mgmt.searchSessions.api.deleted', {
          defaultMessage: 'The search session was deleted.',
        }),
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);

      this.deps.notifications.toasts.addError(err, {
        title: i18n.translate('xpack.data.mgmt.searchSessions.api.deletedError', {
          defaultMessage: 'Failed to delete the search session!',
        }),
      });
    }
  }

  // Extend
  public async sendExtend(id: string, ttl: string): Promise<void> {
    this.deps.notifications.toasts.addError(new Error('Not implemented'), {
      title: i18n.translate('xpack.data.mgmt.searchSessions.api.extendError', {
        defaultMessage: 'Failed to extend the session expiration!',
      }),
    });
  }
}
