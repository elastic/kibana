/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ApplicationStart,
  IToasts,
  IUiSettingsClient,
  ThemeServiceSetup,
} from '@kbn/core/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ISearchEmbeddable, SavedSearch } from '@kbn/discover-plugin/public';
import { loadSharingDataHelpers, SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-plugin/public';
import type { IEmbeddable } from '@kbn/embeddable-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { InjectedIntl } from '@kbn/i18n-react';
import { ILicense } from '@kbn/licensing-plugin/public';
import { CSV_REPORTING_ACTION } from '@kbn/reporting-common';
import type { UiActionsActionDefinition as ActionDefinition } from '@kbn/ui-actions-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { checkLicense, ReportingAPIClient, showReportRequestToasts as showToasts } from '../lib';

function isSavedSearchEmbeddable(
  embeddable: IEmbeddable | ISearchEmbeddable
): embeddable is ISearchEmbeddable {
  return embeddable.type === SEARCH_EMBEDDABLE_TYPE;
}

export interface ActionContext {
  embeddable: ISearchEmbeddable;
  intl: InjectedIntl;
}

interface Params {
  apiClient: ReportingAPIClient;
  application: ApplicationStart;
  data: DataPublicPluginStart;
  license: ILicense;
  uiSettings: IUiSettingsClient;
  theme: ThemeServiceSetup;
  toasts: IToasts;
  usesUiCapabilities: boolean;
}

export class ReportingCsvPanelAction implements ActionDefinition<ActionContext> {
  public readonly type = '';
  public readonly id = CSV_REPORTING_ACTION;
  private apiClient: ReportingAPIClient;
  private application: ApplicationStart;
  private capabilityHasGenerateCsv: boolean = false;
  private data: DataPublicPluginStart;
  private license: ILicense;
  private licenseHasGenerateCsv: boolean = false;
  private theme: ThemeServiceSetup;
  private toasts: IToasts;
  private uiSettings: IUiSettingsClient;
  private usesUiCapabilities: boolean;

  constructor(params: Params) {
    this.apiClient = params.apiClient;
    this.application = params.application;
    this.data = params.data;
    this.license = params.license;
    this.theme = params.theme;
    this.toasts = params.toasts;
    this.uiSettings = params.uiSettings;
    this.usesUiCapabilities = params.usesUiCapabilities;
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
    const { getSharingData } = await loadSharingDataHelpers();
    return await getSharingData(savedSearch.searchSource, savedSearch, {
      uiSettings: this.uiSettings,
      data: this.data,
    });
  }

  public async isCompatible(context: ActionContext) {
    const results = this.license.check('reporting', 'basic');
    const { showLinks } = checkLicense(results);
    this.licenseHasGenerateCsv = showLinks;

    if (this.usesUiCapabilities) {
      // when xpack.reporting.roles.enabled=false, the feature is controlled by UI capabilities.
      this.capabilityHasGenerateCsv = this.application.capabilities.dashboard?.downloadCsv === true; // NOTE: "downloadCsv" can not be renamed
    } else {
      // when xpack.reporting.roles.enabled=true, the feature is controlled by the presence of the reporting_user role
      this.capabilityHasGenerateCsv = true; // deprecated
    }

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
  }

  public async execute(context: ActionContext) {
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

    await this.apiClient.createReportingJob('csv_searchsource', decoratedJobParams).then((job) => {
      showToasts(job.objectType, {
        intl: context.intl,
        apiClient: this.apiClient,
        toasts: this.toasts,
        theme: this.theme,
        // onClose: this.onClose,
      });
    });
  }
}
