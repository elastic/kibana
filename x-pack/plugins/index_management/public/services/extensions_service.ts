/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

export interface ExtensionsSetup {
  addSummary(summary: any): void;
  addAction(action: any): void;
  addBanner(banner: any): void;
  addFilter(filter: any): void;
  addBadge(badge: any): void;
  addToggle(toggle: any): void;
}

export class ExtensionsService {
  private _summaries: any[] = [];
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
  private service?: ExtensionsSetup;

  public setup(): ExtensionsSetup {
    this.service = {
      addAction: this.addAction.bind(this),
      addBadge: this.addBadge.bind(this),
      addBanner: this.addBanner.bind(this),
      addFilter: this.addFilter.bind(this),
      addSummary: this.addSummary.bind(this),
      addToggle: this.addToggle.bind(this),
    };

    return this.service;
  }

  private addSummary(summary: any) {
    this._summaries.push(summary);
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

  public get summaries() {
    return this._summaries;
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
}
