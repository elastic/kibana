/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import type { SecurityPageName } from '../../../../common';
import type { SectionUpsellings, PageUpsellings, UpsellingSectionId } from './types';

export class UpsellingService {
  private sections: Map<UpsellingSectionId, React.ComponentType | string>;
  private pages: Map<SecurityPageName, React.ComponentType>;
  private sectionsSubject$: BehaviorSubject<Map<UpsellingSectionId, React.ComponentType | string>>;
  private pagesSubject$: BehaviorSubject<Map<SecurityPageName, React.ComponentType>>;

  public sections$: Observable<Map<UpsellingSectionId, React.ComponentType | string>>;
  public pages$: Observable<Map<SecurityPageName, React.ComponentType>>;

  constructor() {
    this.sections = new Map();
    this.sectionsSubject$ = new BehaviorSubject(new Map());
    this.sections$ = this.sectionsSubject$.asObservable();
    this.pages = new Map();
    this.pagesSubject$ = new BehaviorSubject(new Map());
    this.pages$ = this.pagesSubject$.asObservable();
  }

  registerSections(sections: SectionUpsellings) {
    Object.entries(sections).forEach(([sectionId, component]) => {
      this.sections.set(sectionId as UpsellingSectionId, component);
    });
    this.sectionsSubject$.next(this.sections);
  }

  registerPages(pages: PageUpsellings) {
    Object.entries(pages).forEach(([pageId, component]) => {
      this.pages.set(pageId as SecurityPageName, component);
    });
    this.pagesSubject$.next(this.pages);
  }

  isPageUpsellable(id: SecurityPageName) {
    return this.pages.has(id);
  }

  getPageUpselling(id: SecurityPageName) {
    return this.pages.get(id);
  }
}
