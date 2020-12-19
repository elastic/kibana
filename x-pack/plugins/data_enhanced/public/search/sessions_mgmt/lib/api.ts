/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { NotificationsStart } from 'kibana/public';
import moment from 'moment';
import { SharePluginStart } from 'src/plugins/share/public';
import { ISessionsClient } from '../../../../../../../src/plugins/data/public';
import { BackgroundSessionSavedObjectAttributes } from '../../../../common';
import {
  ACTION,
  EXPIRES_SOON_IN_DAYS,
  MAX_SEARCH_HITS,
  STATUS,
  UISession,
} from '../../../../common/search/sessions_mgmt';

type UrlGeneratorsStart = SharePluginStart['urlGenerators'];

interface BackgroundSessionSavedObject {
  id: string;
  attributes: BackgroundSessionSavedObjectAttributes;
}

// Helper: factory for a function to map server objects to UI objects
const mapToUISession = (urls: UrlGeneratorsStart) => async (
  savedObject: BackgroundSessionSavedObject
): Promise<UISession> => {
  // Actions: always allow delete
  const actions = [ACTION.DELETE];

  const {
    name,
    appId,
    created,
    expires,
    status,
    urlGeneratorId,
    restoreState,
  } = savedObject.attributes;

  // calculate expiresSoon flag
  let expiresSoon = false;
  if (status === STATUS.COMPLETE) {
    try {
      const currentDate = moment();
      const expiresDate = moment(created);
      const duration = moment.duration(expiresDate.diff(currentDate));

      if (duration.asDays() <= EXPIRES_SOON_IN_DAYS) {
        // TODO: handle negatives by setting status to expired?
        expiresSoon = true;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`Could not calculate duration to expiration`);
      // eslint-disable-next-line no-console
      console.error(err);
    }
  }

  // derive the URL and add it in
  let url = '/';
  try {
    url = await urls.getUrlGenerator(urlGeneratorId).createUrl(restoreState);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Could not create URL from restoreState');
    // eslint-disable-next-line no-console
    console.error(err);
  }

  //
  return {
    id: savedObject.id,
    isViewable: true, // always viewable
    name,
    appId,
    created,
    expires,
    status,
    actions,
    expiresSoon,
    url,
  };
};

// Main
export class SearchSessionsMgmtAPI {
  //
  constructor(
    private sessionsClient: ISessionsClient,
    private urls: UrlGeneratorsStart,
    private notifications: NotificationsStart
  ) {}

  //
  public async fetchTableData(): Promise<UISession[] | null> {
    try {
      const result = await this.sessionsClient.find({
        page: 1,
        perPage: MAX_SEARCH_HITS, // NOTE: using an easier approach to paging the table in-memory, not requesting single pages as they are viewed
        sortField: 'created',
        sortOrder: 'asc',
      });
      if (result.saved_objects) {
        const savedObjects = result.saved_objects as BackgroundSessionSavedObject[];
        return await Promise.all(savedObjects.map(mapToUISession(this.urls)));
      }
      return null;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);

      this.notifications.toasts.addError(err, {
        title: i18n.translate('xpack.data.mgmt.searchSessions.api.fetchError', {
          defaultMessage: 'Failed to refresh the page!',
        }),
      });

      return null;
    }
  }

  // Delete
  public async sendDelete(id: string): Promise<UISession[] | null> {
    try {
      await this.sessionsClient.delete(id);

      this.notifications.toasts.addSuccess({
        title: i18n.translate('xpack.data.mgmt.searchSessions.api.deleted', {
          defaultMessage: 'Deleted session',
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

  // Cancel: not implemented
  public async sendCancel(id: string): Promise<UISession[] | null> {
    this.notifications.toasts.addError(new Error('Not implemented'), {
      title: i18n.translate('xpack.data.mgmt.searchSessions.api.cancelError', {
        defaultMessage: 'Failed to cancel the session!',
      }),
    });

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
