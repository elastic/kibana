/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, type Observable } from 'rxjs';
import { useKibana } from '../common/lib/kibana/kibana_react';

type UserUrl = string | undefined;

export class OnboardingService {
  private usersUrlSubject$: BehaviorSubject<UserUrl>;
  public usersUrl$: Observable<UserUrl>;

  constructor() {
    this.usersUrlSubject$ = new BehaviorSubject<UserUrl>(undefined);
    this.usersUrl$ = this.usersUrlSubject$.asObservable();
  }

  public setSettings({ userUrl }: { userUrl: UserUrl }) {
    this.usersUrlSubject$.next(userUrl);
  }
}

export const useOnboardingService = () => useKibana().services.onboarding;
