/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { INITIAL_SEARCH_SESSION_REST_VERSION } from '@kbn/data-plugin/server';
import expect from '@kbn/expect';
import type { SavedObjectsFindResponse } from '@kbn/core/server';
import type { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import { FtrService } from '../ftr_provider_context';

const SEARCH_SESSION_INDICATOR_TEST_SUBJ = 'searchSessionIndicator';
const SEARCH_SESSIONS_POPOVER_CONTENT_TEST_SUBJ = 'searchSessionIndicatorPopoverContainer';

const BACKGROUND_SEARCH_FLYOUT_ENTRYPOINT = 'openBackgroundSearchFlyoutButton';
const BACKGROUND_SEARCH_SUBMIT_BUTTON = 'querySubmitButton-secondary-button';
const BACKGROUND_SEARCH_CANCEL_BUTTON = 'queryCancelButton-secondary-button';

export const TOUR_TAKING_TOO_LONG_STEP_KEY = `data.searchSession.tour.takingTooLong`;
export const TOUR_RESTORE_STEP_KEY = `data.searchSession.tour.restore`;

type SessionStateType =
  | 'none'
  | 'loading'
  | 'completed'
  | 'backgroundLoading'
  | 'backgroundCompleted'
  | 'restored'
  | 'canceled';

export class SearchSessionsService extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly log = this.ctx.getService('log');
  private readonly retry = this.ctx.getService('retry');
  private readonly browser = this.ctx.getService('browser');
  private readonly security = this.ctx.getService('security');
  private readonly toasts = this.ctx.getService('toasts');
  private readonly es = this.ctx.getService('es');

  public async find(): Promise<WebElementWrapper> {
    return this.testSubjects.find(BACKGROUND_SEARCH_FLYOUT_ENTRYPOINT);
  }

  public async exists(): Promise<boolean> {
    return this.testSubjects.exists(BACKGROUND_SEARCH_FLYOUT_ENTRYPOINT);
  }

  public async missingOrFail(): Promise<void> {
    return this.testSubjects.missingOrFail(BACKGROUND_SEARCH_FLYOUT_ENTRYPOINT);
  }

  public async disabledOrFail() {
    const isDisabled = await this.testSubjects.getAttribute(
      BACKGROUND_SEARCH_SUBMIT_BUTTON,
      'disabled'
    );
    expect(isDisabled).to.be('true');
  }

  /**
   * @deprecated
   */
  public async expectState(state: SessionStateType, timeout = 10000) {
    return this.retry.waitForWithTimeout(
      `searchSessions indicator to get into state = ${state}`,
      timeout,
      async () => {
        const currentState = await (
          await this.testSubjects.find(SEARCH_SESSION_INDICATOR_TEST_SUBJ)
        ).getAttribute('data-state');
        this.log.info(`searchSessions state current: ${currentState} expected: ${state}`);
        return currentState === state;
      }
    );
  }

  /**
   * @deprecated
   */
  public async viewSearchSessions() {
    this.log.debug('viewSearchSessions');
    // await this.ensurePopoverOpened();
    await this.testSubjects.click('searchSessionIndicatorViewSearchSessionsLink');
  }

  public async save({
    searchSessionName,
    // Dashboards don't put the split button in the loading state so the selector is different
    withRefresh = false,
    isSubmitButton = false,
  }: { searchSessionName?: string; isSubmitButton?: boolean; withRefresh?: boolean } = {}) {
    this.log.debug('save the search session');
    if (withRefresh) {
      await this.testSubjects.clickWhenNotDisabledWithoutRetry('querySubmitButton');
    }

    await this.testSubjects.clickWhenNotDisabledWithoutRetry(
      isSubmitButton ? BACKGROUND_SEARCH_SUBMIT_BUTTON : BACKGROUND_SEARCH_CANCEL_BUTTON
    );
    await this.expectSearchSavedToast();

    if (searchSessionName) {
      await this.openFlyoutFromToast();
      // await this.testSubjects.click('searchSessionNameEdit');
      // await this.testSubjects.setValue('searchSessionNameInput', searchSessionName, {
      //   clearWithKeyboard: true,
      // });
      // await this.testSubjects.click('searchSessionNameSave');
    }
  }

  public async expectSearchSavedToast() {
    await this.retry.waitFor(
      'the toast appears indicating that the search session is saved',
      async () => {
        const count = await this.toasts.getCount();
        return count > 0;
      }
    );
  }

  public async openFlyoutFromToast() {
    await this.expectSearchSavedToast();
    await this.testSubjects.click('backgroundSearchToastLink');
  }

  public async openFlyout() {
    await this.testSubjects.click(BACKGROUND_SEARCH_FLYOUT_ENTRYPOINT);
    await this.expectManagementTable();
  }

  public async expectManagementTable() {
    await this.testSubjects.existOrFail('searchSessionsMgmtUiTable');
  }

  /**
   * @deprecated
   */
  public async cancel() {
    this.log.debug('cancel the search session');
    // await this.ensurePopoverOpened();
    await this.testSubjects.click('searchSessionIndicatorCancelBtn');
    // await this.ensurePopoverClosed();
  }

  /**
   * @deprecated
   */
  public async openPopover() {
    // await this.ensurePopoverOpened();
  }

  /**
   * @deprecated
   */
  public async openedOrFail() {
    return this.testSubjects.existOrFail(SEARCH_SESSIONS_POPOVER_CONTENT_TEST_SUBJ, {
      timeout: 15000, // because popover auto opens after search takes 10s
    });
  }

  /**
   * @deprecated
   */
  public async closedOrFail() {
    return this.testSubjects.missingOrFail(SEARCH_SESSIONS_POPOVER_CONTENT_TEST_SUBJ, {
      timeout: 15000, // because popover auto opens after search takes 10s
    });
  }

  /*
   * This cleanup function should be used by tests that create new search sessions.
   * Tests should not end with new search sessions remaining in storage since that interferes with functional tests that check the _find API.
   * Alternatively, a test can navigate to `Management > Search Sessions` and use the UI to delete any created tests.
   */
  public async deleteAllSearchSessions() {
    this.log.debug('Deleting created search sessions');
    // ignores 409 errs and keeps retrying
    await this.retry.tryForTime(10000, async () => {
      const { body } = await this.security.testUserSupertest
        .post('/internal/session/_find')
        .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_SEARCH_SESSION_REST_VERSION)
        .set('kbn-xsrf', 'anything')
        .set('kbn-system-request', 'true')
        .send({
          page: 1,
          perPage: 10000,
          sortField: 'created',
          sortOrder: 'asc',
        })
        .expect(200);

      const { saved_objects: savedObjects } = body as SavedObjectsFindResponse;

      if (savedObjects.length > 0) {
        this.log.debug(`Found created search sessions: ${savedObjects.map(({ id }) => id)}`);
      } else {
        this.log.debug(`Found no search sessions to delete`);
        return;
      }

      await Promise.all(
        savedObjects.map(async (so) => {
          this.log.debug(`Deleting search session: ${so.id}`);
          await this.security.testUserSupertest
            .delete(`/internal/session/${so.id}`)
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_SEARCH_SESSION_REST_VERSION)
            .set(`kbn-xsrf`, `anything`)
            .expect(200);
        })
      );
    });
  }

  public async markTourDone() {
    await Promise.all([
      this.browser.setLocalStorageItem(TOUR_TAKING_TOO_LONG_STEP_KEY, 'true'),
      this.browser.setLocalStorageItem(TOUR_RESTORE_STEP_KEY, 'true'),
    ]);
  }

  public async markTourUndone() {
    await Promise.all([
      this.browser.removeLocalStorageItem(TOUR_TAKING_TOO_LONG_STEP_KEY),
      this.browser.removeLocalStorageItem(TOUR_RESTORE_STEP_KEY),
    ]);
  }

  public async getAsyncSearchStatus(asyncSearchId: string) {
    const asyncSearchStatus = await this.es.asyncSearch.status({ id: asyncSearchId });
    return asyncSearchStatus;
  }

  public async getAsyncSearchExpirationTime(asyncSearchId: string): Promise<number> {
    const asyncSearchStatus = await this.getAsyncSearchStatus(asyncSearchId);
    return Number(asyncSearchStatus.expiration_time_in_millis);
  }
}
