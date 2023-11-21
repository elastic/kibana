/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, map } from 'rxjs';
import type { Observable } from 'rxjs';

export type ContractComponentName = 'getStarted' | 'dashboardsLandingCallout';

export type ContractComponents = Partial<Record<ContractComponentName, React.ComponentType>>;

export type SetComponents = (components: ContractComponents) => void;
export type GetComponent$ = (
  name: ContractComponentName
) => Observable<React.ComponentType | undefined>;

export class ContractComponentsService {
  private components$: BehaviorSubject<ContractComponents>;

  constructor() {
    this.components$ = new BehaviorSubject<ContractComponents>({});
  }

  public setComponents: SetComponents = (components) => {
    this.components$.next(components);
  };

  public getComponent$: GetComponent$ = (name) =>
    this.components$.pipe(map((components) => components[name]));
}
