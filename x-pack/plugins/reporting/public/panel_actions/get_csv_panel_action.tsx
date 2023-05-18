/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import * as Rx from 'rxjs';
import type { CoreSetup } from '@kbn/core/public';
import { CoreStart } from '@kbn/core/public';
import type { ISearchEmbeddable, SavedSearch } from '@kbn/discover-plugin/public';
import { loadSharingDataHelpers, SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-plugin/public';
import type { IEmbeddable } from '@kbn/embeddable-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import type { UiActionsActionDefinition as ActionDefinition } from '@kbn/ui-actions-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { CSV_REPORTING_ACTION } from '@kbn/reporting-common';
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
  public readonly type = '';
  public readonly id = CSV_REPORTING_ACTION;
  private licenseHasGenerateCsv: boolean = false;
  private capabilityHasGenerateCsv: boolean = false;
  private apiClient: ReportingAPIClient;
  private startServices$: Params['startServices$'];
  private usesUiCapabilities: boolean;

  constructor({ apiClient, startServices$, usesUiCapabilities }: Params) {
    this.apiClient = apiClient;

    this.startServices$ = startServices$;
    this.usesUiCapabilities = usesUiCapabilities;
  }

  public getIconType() {
    return 'document';
  }

  public getDisplayName() {
    return i18n.translate('xpack.reporting.dashboard.generateCsvPanelTitle', {
      defaultMessage: 'Generate CSV report',
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
          this.licenseHasGenerateCsv = showLinks;
        });

        if (this.usesUiCapabilities) {
          // when xpack.reporting.roles.enabled=false, the feature is controlled by UI capabilities.
          this.capabilityHasGenerateCsv = application.capabilities.dashboard?.downloadCsv === true; // NOTE: "download" can not be renamed
        } else {
          // when xpack.reporting.roles.enabled=true, the feature is controlled by the presence of the reporting_user role
          this.capabilityHasGenerateCsv = true; // deprecated
        }

        resolve();
      });
    });

    if (!this.licenseHasGenerateCsv || !this.capabilityHasGenerateCsv) {
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

    const savedSearch = embeddable.getSavedSearch();
    const { columns, getSearchSource } = await this.getSearchSource(savedSearch, embeddable);

    const decoratedJobParams = this.apiClient.getDecoratedJobParams({
      searchSource: getSearchSource(true),
      columns,
      title: savedSearch.title || '',
      objectType: 'search',
    });

    // FIXME: disable generation controls, prevent multi-click
    // FIXME: show toast notification
    await this.apiClient.createReportingJob('csv_searchsource', decoratedJobParams);
  };
}
