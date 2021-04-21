/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import moment from 'moment-timezone';
import * as Rx from 'rxjs';
import type { CoreSetup } from 'src/core/public';
import { CoreStart } from 'src/core/public';
import type { ISearchEmbeddable, SavedSearch } from '../../../../../src/plugins/discover/public';
import {
  loadSharingDataHelpers,
  SEARCH_EMBEDDABLE_TYPE,
} from '../../../../../src/plugins/discover/public';
import type { IEmbeddable } from '../../../../../src/plugins/embeddable/public';
import { ViewMode } from '../../../../../src/plugins/embeddable/public';
import type { UiActionsActionDefinition as ActionDefinition } from '../../../../../src/plugins/ui_actions/public';
import { IncompatibleActionError } from '../../../../../src/plugins/ui_actions/public';
import type { LicensingPluginSetup } from '../../../licensing/public';
import { API_GENERATE_IMMEDIATE, CSV_REPORTING_ACTION } from '../../common/constants';
import type { JobParamsDownloadCSV } from '../../server/export_types/csv_searchsource_immediate/types';
import { checkLicense } from '../lib/license_check';

function isSavedSearchEmbeddable(
  embeddable: IEmbeddable | ISearchEmbeddable
): embeddable is ISearchEmbeddable {
  return embeddable.type === SEARCH_EMBEDDABLE_TYPE;
}

interface ActionContext {
  embeddable: ISearchEmbeddable;
}

interface Params {
  core: CoreSetup;
  startServices$: Rx.Observable<[CoreStart, object, unknown]>;
  license$: LicensingPluginSetup['license$'];
  usesUiCapabilities: boolean;
}

export class ReportingCsvPanelAction implements ActionDefinition<ActionContext> {
  private isDownloading: boolean;
  public readonly type = '';
  public readonly id = CSV_REPORTING_ACTION;
  private licenseHasDownloadCsv: boolean = false;
  private capabilityHasDownloadCsv: boolean = false;
  private core: CoreSetup;

  constructor({ core, startServices$, license$, usesUiCapabilities }: Params) {
    this.isDownloading = false;
    this.core = core;

    license$.subscribe((license) => {
      const results = license.check('reporting', 'basic');
      const { showLinks } = checkLicense(results);
      this.licenseHasDownloadCsv = showLinks;
    });

    if (usesUiCapabilities) {
      startServices$.subscribe(([{ application }]) => {
        this.capabilityHasDownloadCsv = application.capabilities.dashboard?.downloadCsv === true;
      });
    } else {
      this.capabilityHasDownloadCsv = true; // deprecated
    }
  }

  public getIconType() {
    return 'document';
  }

  public getDisplayName() {
    return i18n.translate('xpack.reporting.dashboard.downloadCsvPanelTitle', {
      defaultMessage: 'Download CSV',
    });
  }

  public async getSearchSource(savedSearch: SavedSearch, embeddable: ISearchEmbeddable) {
    const { getSharingData } = await loadSharingDataHelpers();
    return await getSharingData(
      savedSearch.searchSource,
      savedSearch, // TODO: get unsaved state (using embeddale.searchScope): https://github.com/elastic/kibana/issues/43977
      this.core.uiSettings
    );
  }

  public isCompatible = async (context: ActionContext) => {
    if (!this.licenseHasDownloadCsv || !this.capabilityHasDownloadCsv) {
      return false;
    }

    const { embeddable } = context;

    return embeddable.getInput().viewMode !== ViewMode.EDIT && embeddable.type === 'search';
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
    const { columns, searchSource } = await this.getSearchSource(savedSearch, embeddable);

    // If the TZ is set to the default "Browser", it will not be useful for
    // server-side export. We need to derive the timezone and pass it as a param
    // to the export API.
    // TODO: create a helper utility in Reporting. This is repeated in a few places.
    const kibanaTimezone = this.core.uiSettings.get('dateFormat:tz');
    const browserTimezone = kibanaTimezone === 'Browser' ? moment.tz.guess() : kibanaTimezone;
    const immediateJobParams: JobParamsDownloadCSV = {
      searchSource,
      columns,
      browserTimezone,
      title: savedSearch.title,
    };

    const body = JSON.stringify(immediateJobParams);

    this.isDownloading = true;

    this.core.notifications.toasts.addSuccess({
      title: i18n.translate('xpack.reporting.dashboard.csvDownloadStartedTitle', {
        defaultMessage: `CSV Download Started`,
      }),
      text: i18n.translate('xpack.reporting.dashboard.csvDownloadStartedMessage', {
        defaultMessage: `Your CSV will download momentarily.`,
      }),
      'data-test-subj': 'csvDownloadStarted',
    });

    await this.core.http
      .post(`${API_GENERATE_IMMEDIATE}`, { body })
      .then((rawResponse: string) => {
        this.isDownloading = false;

        const download = `${savedSearch.title}.csv`;
        const blob = new Blob([rawResponse], { type: 'text/csv;charset=utf-8;' });

        // Hack for IE11 Support
        if (window.navigator.msSaveOrOpenBlob) {
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

  private onGenerationFail(error: Error) {
    this.isDownloading = false;
    this.core.notifications.toasts.addDanger({
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
