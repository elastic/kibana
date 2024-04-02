/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import type { SecurityProductTypes } from '../../../common/components/landing_page/onboarding/configs';
import type { StepId } from '../../../common/components/landing_page/onboarding/types';

export class OnboardingPageService {
  private productTypesSubject$: BehaviorSubject<SecurityProductTypes | undefined>;
  private projectsUrlSubject$: BehaviorSubject<string | undefined>;
  private projectFeaturesUrlSubject$: BehaviorSubject<string | undefined>;
  private availableStepsSubject$: BehaviorSubject<StepId[]>;

  public productTypes$: Observable<SecurityProductTypes | undefined>;
  public projectsUrl$: Observable<string | undefined>;
  public projectFeaturesUrl$: Observable<string | undefined>;
  public availableSteps$: Observable<StepId[]>;

  constructor() {
    this.productTypesSubject$ = new BehaviorSubject<SecurityProductTypes | undefined>(undefined);
    this.projectsUrlSubject$ = new BehaviorSubject<string | undefined>(undefined);
    this.projectFeaturesUrlSubject$ = new BehaviorSubject<string | undefined>(undefined);
    this.availableStepsSubject$ = new BehaviorSubject<StepId[]>([]);

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
  setAvailableSteps(availableSteps: StepId[]) {
    this.availableStepsSubject$.next(availableSteps);
  }
}
