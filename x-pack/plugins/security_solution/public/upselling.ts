/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import type { Capabilities } from '@kbn/core/types';
import type { SecurityPageName } from '../common';
import { hasCapabilities } from './common/lib/capabilities';

export interface SectionConfig {
  capabilities: string[];
  component: React.ComponentType;
}
export interface PageConfig {
  component: React.ComponentType;
}

export class UpsellingService {
  private sections: Map<string, SectionConfig & { hasCapability?: boolean }>;
  private pages: Map<SecurityPageName, PageConfig & { hasCapability?: boolean }>;
  private sectionsSubject$: BehaviorSubject<Map<string, React.ComponentType>>;
  private pagesSubject$: BehaviorSubject<Map<SecurityPageName, React.ComponentType>>;

  public sections$: Observable<Map<string, React.ComponentType>>;
  public pages$: Observable<Map<SecurityPageName, React.ComponentType>>;

  constructor() {
    this.sections = new Map();
    this.sectionsSubject$ = new BehaviorSubject(new Map());
    this.sections$ = this.sectionsSubject$.asObservable();
    this.pages = new Map();
    this.pagesSubject$ = new BehaviorSubject(new Map());
    this.pages$ = this.pagesSubject$.asObservable();
  }

  registerSections(
    sections: Record<string, { capabilities: string[]; component: React.ComponentType }>
  ) {
    Object.entries(sections).forEach(([sectionId, config]) => {
      this.sections.set(sectionId, config);
    });
  }

  registerPages(pages: Partial<Record<SecurityPageName, React.ComponentType>>) {
    Object.entries(pages).forEach(([pageId, component]) => {
      this.pages.set(pageId as SecurityPageName, { component });
    });
  }

  start(capabilities: Capabilities) {
    for (const [sectionId, sectionConfig] of this.sections) {
      this.sections.set(sectionId, {
        ...sectionConfig,
        hasCapability: hasCapabilities(capabilities, sectionConfig.capabilities),
      });
    }
    this.syncSections();
  }

  setPagesCapabilities(pagesCapabilities: Array<[SecurityPageName, boolean]>) {
    for (const [pageId, hasCapability] of pagesCapabilities) {
      const page = this.pages.get(pageId);
      if (page) {
        this.pages.set(pageId, { ...page, hasCapability });
      }
    }
    this.syncPages();
  }

  isPageUpsellable(id: SecurityPageName) {
    return this.pages.has(id);
  }

  getPageUpsellComponent(id: SecurityPageName) {
    return this.pages.get(id)?.component;
  }

  private syncSections() {
    this.sectionsSubject$.next(this.getFilteredMap(this.sections));
  }

  private syncPages() {
    this.pagesSubject$.next(this.getFilteredMap(this.pages));
  }

  private getFilteredMap<T>(
    upsellConfigsMap: Map<T, { hasCapability?: boolean; component: React.ComponentType }>
  ) {
    return new Map<T, React.ComponentType>(
      [...upsellConfigsMap]
        .filter(([_id, { hasCapability }]) => hasCapability === false) // filtered out if hasCapability is not defined
        .map(([id, page]) => [id, page.component])
    );
  }
}
