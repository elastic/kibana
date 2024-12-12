/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  IndexBadge,
  IndexToggle,
  IndicesListColumn,
  EmptyListContent,
  IndexContent,
  ExtensionsSetup,
} from '@kbn/index-management-shared-types';
import { IndexDetailsTab } from '../../common/constants';

export class ExtensionsService {
  private _actions: any[] = [];
  private _banners: any[] = [];
  private _filters: any[] = [];
  private _badges: IndexBadge[] = [
    {
      matchIndex: (index) => {
        return index.isFrozen;
      },
      label: i18n.translate('xpack.idxMgmt.frozenBadgeLabel', {
        defaultMessage: 'Frozen',
      }),
      filterExpression: 'isFrozen:true',
      color: 'primary',
    },
  ];
  private _toggles: IndexToggle[] = [
    {
      matchIndex: (index) => {
        return index.hidden;
      },
      label: i18n.translate('xpack.idxMgmt.indexTable.hiddenIndicesSwitchLabel', {
        defaultMessage: 'Include hidden indices',
      }),
      name: 'includeHiddenIndices',
    },
  ];
  private _columns: IndicesListColumn[] = [];
  private _emptyListContent: EmptyListContent | null = null;
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
      addColumn: this.addColumn.bind(this),
      setEmptyListContent: this.setEmptyListContent.bind(this),
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

  private addColumn(column: IndicesListColumn) {
    this._columns.push(column);
  }

  private setEmptyListContent(content: EmptyListContent) {
    if (this._emptyListContent) {
      throw new Error(`The empty list content has already been set.`);
    } else {
      this._emptyListContent = content;
    }
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

  public get columns() {
    return this._columns;
  }

  public get emptyListContent() {
    return this._emptyListContent;
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
