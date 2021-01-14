/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import type { NotificationsStart } from 'kibana/public';
import moment from 'moment';
import { from, race, timer } from 'rxjs';
import { mapTo, tap } from 'rxjs/operators';
import type { SharePluginStart } from 'src/plugins/share/public';
import { SessionsMgmtConfigSchema } from '../';
import type { ISessionsClient } from '../../../../../../../src/plugins/data/public';
import type { SearchSessionSavedObject } from '../../../../common';
import { ACTION, STATUS, UISession } from '../../../../common/search/sessions_mgmt';

type UrlGeneratorsStart = SharePluginStart['urlGenerators'];

// Helper: factory for a function to map server objects to UI objects
const mapToUISession = (
  urls: UrlGeneratorsStart,
  { expiresSoonWarning }: SessionsMgmtConfigSchema
) => async (savedObject: SearchSessionSavedObject): Promise<UISession> => {
  // Actions: always allow delete
  const actions = [ACTION.DELETE];

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

  const isRestorable = status === STATUS.IN_PROGRESS || status === STATUS.COMPLETE;

  // derive the URL and add it in
  let url = '/';
  try {
    url = await urls
      .getUrlGenerator(urlGeneratorId)
      .createUrl(isRestorable ? restoreState : initialState);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Could not create URL from restoreState');
    // eslint-disable-next-line no-console
    console.error(err);
  }

  return {
    id: savedObject.id,
    isRestorable,
    name,
    appId,
    created,
    expires,
    status,
    actions,
    url,
  };
};

export class SearchSessionsMgmtAPI {
  constructor(
    private sessionsClient: ISessionsClient,
    private urls: UrlGeneratorsStart,
    private notifications: NotificationsStart,
    private config: SessionsMgmtConfigSchema
  ) {}

  public async fetchTableData(): Promise<UISession[]> {
    interface FetchResult {
      saved_objects: object[];
    }

    const refreshTimeout = moment.duration(this.config.refreshTimeout);

    const fetch$ = from(
      this.sessionsClient.find({
        page: 1,
        perPage: this.config.maxSessions,
        sortField: 'created',
        sortOrder: 'asc',
      })
    );
    const timeout$ = timer(refreshTimeout.asMilliseconds()).pipe(
      tap(() => {
        this.notifications.toasts.addDanger(
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
        const savedObjects = result.saved_objects as SearchSessionSavedObject[];
        return await Promise.all(savedObjects.map(mapToUISession(this.urls, this.config)));
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      this.notifications.toasts.addError(err, {
        title: i18n.translate('xpack.data.mgmt.searchSessions.api.fetchError', {
          defaultMessage: 'Failed to refresh the page!',
        }),
      });
    }

    return [];
  }

  // Delete
  public async sendDelete(id: string): Promise<UISession[] | null> {
    try {
      await this.sessionsClient.delete(id);

      this.notifications.toasts.addSuccess({
        title: i18n.translate('xpack.data.mgmt.searchSessions.api.deleted', {
          defaultMessage: 'Deleted the session',
        }),
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);

      this.notifications.toasts.addError(err, {
        title: i18n.translate('xpack.data.mgmt.searchSessions.api.deleteError', {
          defaultMessage: 'Failed to delete the session!',
        }),
      });
    }

    return await this.fetchTableData();
  }

  // Extend
  public async sendExtend(id: string): Promise<UISession[] | null> {
    this.notifications.toasts.addError(new Error('Not implemented'), {
      title: i18n.translate('xpack.data.mgmt.searchSessions.api.extendError', {
        defaultMessage: 'Failed to extend the session expiration!',
      }),
    });

    return await this.fetchTableData();
  }
}
