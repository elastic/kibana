/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { BehaviorSubject } from 'rxjs';

// TODO: remove after rollout https://github.com/elastic/kibana/issues/179572
export const isSolutionNavigationEnabledUpdater$ = new BehaviorSubject<boolean>(false);
export const isSolutionNavigationEnabled$ = isSolutionNavigationEnabledUpdater$.asObservable();
