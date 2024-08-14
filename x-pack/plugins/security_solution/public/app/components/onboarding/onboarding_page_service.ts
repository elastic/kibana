/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import type { SecurityProductTypes } from '../../../common/components/landing_page/onboarding/configs';
import type { CardId } from '../../../common/components/landing_page/onboarding/types';

export class OnboardingPageService {
  private productTypesSubject$: BehaviorSubject<SecurityProductTypes | undefined>;
  private projectsUrlSubject$: BehaviorSubject<string | undefined>;
  private projectFeaturesUrlSubject$: BehaviorSubject<string | undefined>;
  private availableStepsSubject$: BehaviorSubject<CardId[]>;

  public productTypes$: Observable<SecurityProductTypes | undefined>;
  public projectsUrl$: Observable<string | undefined>;
  public projectFeaturesUrl$: Observable<string | undefined>;
  public availableSteps$: Observable<CardId[]>;

  constructor() {
    this.productTypesSubject$ = new BehaviorSubject<SecurityProductTypes | undefined>(undefined);
    this.projectsUrlSubject$ = new BehaviorSubject<string | undefined>(undefined);
    this.projectFeaturesUrlSubject$ = new BehaviorSubject<string | undefined>(undefined);
    this.availableStepsSubject$ = new BehaviorSubject<CardId[]>([]);

    this.productTypes$ = this.productTypesSubject$.asObservable();
    this.projectsUrl$ = this.projectsUrlSubject$.asObservable();
    this.projectFeaturesUrl$ = this.projectFeaturesUrlSubject$.asObservable();
    this.availableSteps$ = this.availableStepsSubject$.asObservable();
  }

  setProductTypes(productTypes: SecurityProductTypes) {
    this.productTypesSubject$.next(productTypes);
  }
  setProjectFeaturesUrl(projectFeaturesUrl: string | undefined) {
    this.projectFeaturesUrlSubject$.next(projectFeaturesUrl);
  }
  setProjectsUrl(projectsUrl: string | undefined) {
    this.projectsUrlSubject$.next(projectsUrl);
  }
  setAvailableSteps(availableSteps: CardId[]) {
    this.availableStepsSubject$.next(availableSteps);
  }
}
