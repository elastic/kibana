/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FunctionComponent } from 'react';
import { ApplicationStart } from '@kbn/core-application-browser';
import { EuiBadgeProps } from '@elastic/eui';
import type { IndexDetailsTab } from '../../common/constants';
import { Index } from '..';

export interface IndexContent {
  renderContent: (args: {
    index: Index;
    getUrlForApp: ApplicationStart['getUrlForApp'];
  }) => ReturnType<FunctionComponent>;
}

export interface IndexBadge {
  matchIndex: (index: Index) => boolean;
  label: string;
  // a parseable search bar filter expression, for example "isFollowerIndex:true"
  filterExpression?: string;
  color: EuiBadgeProps['color'];
}

export interface ExtensionsSetup {
  // adds an option to the "manage index" menu
  addAction(action: any): void;
  // adds a banner to the indices list
  addBanner(banner: any): void;
  // adds a filter to the indices list
  addFilter(filter: any): void;
  // adds a badge to the index name
  addBadge(badge: IndexBadge): void;
  // adds a toggle to the indices list
  addToggle(toggle: any): void;
  // adds a tab to the index details page
  addIndexDetailsTab(tab: IndexDetailsTab): void;
  // sets content to render instead of the code block on the overview tab of the index page
  setIndexOverviewContent(content: IndexContent): void;
  // sets content to render below the docs link on the mappings tab of the index page
  setIndexMappingsContent(content: IndexContent): void;
}

export class ExtensionsService {
  private _actions: any[] = [];
  private _banners: any[] = [];
  private _filters: any[] = [];
  private _badges: IndexBadge[] = [
    {
      matchIndex: (index: { isFrozen: boolean }) => {
        return index.isFrozen;
      },
      label: i18n.translate('xpack.idxMgmt.frozenBadgeLabel', {
        defaultMessage: 'Frozen',
      }),
      filterExpression: 'isFrozen:true',
      color: 'primary',
    },
  ];
  private _toggles: any[] = [];
  private _indexDetailsTabs: IndexDetailsTab[] = [];
  private _indexOverviewContent: IndexContent | null = null;
  private _indexMappingsContent: IndexContent | null = null;
  private service?: ExtensionsSetup;

  public setup(): ExtensionsSetup {
    this.service = {
      addAction: this.addAction.bind(this),
      addBadge: this.addBadge.bind(this),
      addBanner: this.addBanner.bind(this),
      addFilter: this.addFilter.bind(this),
      addToggle: this.addToggle.bind(this),
      addIndexDetailsTab: this.addIndexDetailsTab.bind(this),
      setIndexOverviewContent: this.setIndexOverviewContent.bind(this),
      setIndexMappingsContent: this.setIndexMappingsContent.bind(this),
    };

    return this.service;
  }

  private addAction(action: any) {
    this._actions.push(action);
  }

  private addBanner(banner: any) {
    this._banners.push(banner);
  }

  private addFilter(filter: any) {
    this._filters.push(filter);
  }

  private addBadge(badge: IndexBadge) {
    this._badges.push(badge);
  }

  private addToggle(toggle: any) {
    this._toggles.push(toggle);
  }

  private addIndexDetailsTab(tab: IndexDetailsTab) {
    this._indexDetailsTabs.push(tab);
  }

  private setIndexOverviewContent(content: IndexContent) {
    if (this._indexOverviewContent) {
      throw new Error(`The content for index overview has already been set.`);
    } else {
      this._indexOverviewContent = content;
    }
  }

  private setIndexMappingsContent(content: IndexContent) {
    if (this._indexMappingsContent) {
      throw new Error(`The content for index mappings has already been set.`);
    } else {
      this._indexMappingsContent = content;
    }
  }

  public get actions() {
    return this._actions;
  }

  public get banners() {
    return this._banners;
  }

  public get filters() {
    return this._filters;
  }

  public get badges() {
    return this._badges;
  }

  public get toggles() {
    return this._toggles;
  }

  public get indexDetailsTabs() {
    return this._indexDetailsTabs;
  }

  public get indexOverviewContent() {
    return this._indexOverviewContent;
  }

  public get indexMappingsContent() {
    return this._indexMappingsContent;
  }
}
