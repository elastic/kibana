/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FunctionComponent } from 'react';
import { ApplicationStart } from '@kbn/core-application-browser';
import type { IndexDetailsTab } from '../../common/constants';
import { Index } from '..';

export interface IndexOverviewContent {
  renderContent: (args: {
    index: Index;
    getUrlForApp: ApplicationStart['getUrlForApp'];
  }) => ReturnType<FunctionComponent>;
}

export interface ExtensionsSetup {
  addAction(action: any): void;
  addBanner(banner: any): void;
  addFilter(filter: any): void;
  addBadge(badge: any): void;
  addToggle(toggle: any): void;
  addIndexDetailsTab(tab: IndexDetailsTab): void;
  setIndexOverviewContent(content: IndexOverviewContent): void;
}

export class ExtensionsService {
  private _actions: any[] = [];
  private _banners: any[] = [];
  private _filters: any[] = [];
  private _badges: any[] = [
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
  private _indexOverviewContent: IndexOverviewContent | null = null;
  private service?: ExtensionsSetup;

  public setup(): ExtensionsSetup {
    this.service = {
      addAction: this.addAction.bind(this),
      addBadge: this.addBadge.bind(this),
      addBanner: this.addBanner.bind(this),
      addFilter: this.addFilter.bind(this),
      addToggle: this.addToggle.bind(this),
      addIndexDetailsTab: this.addIndexDetailsTab.bind(this),
      setIndexOverviewContent: this.setIndexOverviewMainContent.bind(this),
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

  private addBadge(badge: any) {
    this._badges.push(badge);
  }

  private addToggle(toggle: any) {
    this._toggles.push(toggle);
  }

  private addIndexDetailsTab(tab: IndexDetailsTab) {
    this._indexDetailsTabs.push(tab);
  }

  private setIndexOverviewMainContent(content: IndexOverviewContent) {
    if (this._indexOverviewContent) {
      throw new Error(`The content for index overview has already been set.`);
    } else {
      this._indexOverviewContent = content;
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
}
