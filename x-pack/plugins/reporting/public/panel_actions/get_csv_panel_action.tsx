/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import * as Rx from 'rxjs';
import type { CoreSetup, NotificationsSetup } from '@kbn/core/public';
import { CoreStart } from '@kbn/core/public';
import type { ISearchEmbeddable, SavedSearch } from '@kbn/discover-plugin/public';
import { loadSharingDataHelpers, SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-plugin/public';
import type { IEmbeddable } from '@kbn/embeddable-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import type { UiActionsActionDefinition as ActionDefinition } from '@kbn/ui-actions-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { CSV_REPORTING_ACTION } from '../../common/constants';
import { checkLicense } from '../lib/license_check';
import { ReportingAPIClient } from '../lib/reporting_api_client';
import type { ReportingPublicPluginStartDendencies } from '../plugin';
function isSavedSearchEmbeddable(
  embeddable: IEmbeddable | ISearchEmbeddable
): embeddable is ISearchEmbeddable {
  return embeddable.type === SEARCH_EMBEDDABLE_TYPE;
}

export interface ActionContext {
  embeddable: ISearchEmbeddable;
}

interface Params {
  apiClient: ReportingAPIClient;
  core: CoreSetup;
  startServices$: Rx.Observable<[CoreStart, ReportingPublicPluginStartDendencies, unknown]>;
  usesUiCapabilities: boolean;
}

export class ReportingCsvPanelAction implements ActionDefinition<ActionContext> {
  private isDownloading: boolean;
  public readonly type = '';
  public readonly id = CSV_REPORTING_ACTION;
  private licenseHasDownloadCsv: boolean = false;
  private capabilityHasDownloadCsv: boolean = false;
  private notifications: NotificationsSetup;
  private apiClient: ReportingAPIClient;
  private startServices$: Params['startServices$'];
  private usesUiCapabilities: any;

  constructor({ core, apiClient, startServices$, usesUiCapabilities }: Params) {
    this.isDownloading = false;

    this.notifications = core.notifications;
    this.apiClient = apiClient;

    this.startServices$ = startServices$;
    this.usesUiCapabilities = usesUiCapabilities;
  }

  public getIconType() {
    return 'document';
  }

  public getDisplayName() {
    return i18n.translate('xpack.reporting.dashboard.downloadCsvPanelTitle', {
      defaultMessage: 'Download CSV',
    });
  }

  public async getSearchSource(savedSearch: SavedSearch, _embeddable: ISearchEmbeddable) {
    const [{ uiSettings }, { data }] = await Rx.firstValueFrom(this.startServices$);
    const { getSharingData } = await loadSharingDataHelpers();
    return await getSharingData(savedSearch.searchSource, savedSearch, { uiSettings, data });
  }

  public isCompatible = async (context: ActionContext) => {
    await new Promise<void>((resolve) => {
      this.startServices$.subscribe(([{ application }, { licensing }]) => {
        licensing.license$.subscribe((license) => {
          const results = license.check('reporting', 'basic');
          const { showLinks } = checkLicense(results);
          this.licenseHasDownloadCsv = showLinks;
        });

        if (this.usesUiCapabilities) {
          this.capabilityHasDownloadCsv = application.capabilities.dashboard?.downloadCsv === true;
        } else {
          this.capabilityHasDownloadCsv = true; // deprecated
        }

        resolve();
      });
    });

    if (!this.licenseHasDownloadCsv || !this.capabilityHasDownloadCsv) {
      return false;
    }

    const { embeddable } = context;

    if (embeddable.type !== 'search') {
      return false;
    }

    const savedSearch = embeddable.getSavedSearch();
    const query = savedSearch.searchSource.getField('query');

    // using isOfAggregateQueryType(query) added increased the bundle size over the configured limit of 55.7KB
    if (query && Boolean(query && 'sql' in query)) {
      // hide exporting CSV for SQL
      return false;
    }
    return embeddable.getInput().viewMode !== ViewMode.EDIT;
  };

  public execute = async (context: ActionContext) => {
    const { embeddable } = context;

    if (!isSavedSearchEmbeddable(embeddable) || !(await this.isCompatible(context))) {
      throw new IncompatibleActionError();
    }

    if (this.isDownloading) {
      return;
    }

    const savedSearch = embeddable.getSavedSearch();
    const { columns, getSearchSource } = await this.getSearchSource(savedSearch, embeddable);

    const immediateJobParams = this.apiClient.getDecoratedJobParams({
      searchSource: getSearchSource(true),
      columns,
      title: savedSearch.title || '',
      objectType: 'downloadCsv', // FIXME: added for typescript, but immediate download job does not need objectType
    });

    this.isDownloading = true;

    this.notifications.toasts.addSuccess({
      title: i18n.translate('xpack.reporting.dashboard.csvDownloadStartedTitle', {
        defaultMessage: `CSV Download Started`,
      }),
      text: i18n.translate('xpack.reporting.dashboard.csvDownloadStartedMessage', {
        defaultMessage: `Your CSV will download momentarily.`,
      }),
      'data-test-subj': 'csvDownloadStarted',
    });

    await this.apiClient
      .createImmediateReport(immediateJobParams)
      .then(({ body, response }) => {
        this.isDownloading = false;

        const download = `${savedSearch.title}.csv`;
        const blob = new Blob([body as BlobPart], {
          type: response?.headers.get('content-type') || undefined,
        });

        // Hack for IE11 Support
        // @ts-expect-error
        if (window.navigator.msSaveOrOpenBlob) {
          // @ts-expect-error
          return window.navigator.msSaveOrOpenBlob(blob, download);
        }

        const a = window.document.createElement('a');
        const downloadObject = window.URL.createObjectURL(blob);

        a.href = downloadObject;
        a.download = download;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadObject);
        document.body.removeChild(a);
      })
      .catch(this.onGenerationFail.bind(this));
  };

  private onGenerationFail(_error: Error) {
    this.isDownloading = false;
    this.notifications.toasts.addDanger({
      title: i18n.translate('xpack.reporting.dashboard.failedCsvDownloadTitle', {
        defaultMessage: `CSV download failed`,
      }),
      text: i18n.translate('xpack.reporting.dashboard.failedCsvDownloadMessage', {
        defaultMessage: `We couldn't generate your CSV at this time.`,
      }),
      'data-test-subj': 'downloadCsvFail',
    });
  }
}
