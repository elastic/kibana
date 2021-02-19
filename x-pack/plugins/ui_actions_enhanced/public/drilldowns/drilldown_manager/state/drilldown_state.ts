/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useObservable from 'react-use/lib/useObservable';
import { BehaviorSubject } from 'rxjs';
import {
  ActionFactory,
  BaseActionConfig,
  BaseActionFactoryContext,
} from '../../../dynamic_actions';
import { ActionFactoryPlaceContext } from '../types';

export interface DrilldownStateDeps {
  factory: ActionFactory;
  placeContext: ActionFactoryPlaceContext<BaseActionFactoryContext>;
  name?: string;
  triggers?: string[];
  config?: BaseActionConfig;
}

/**
 * An instance of this class represents UI states of a single drilldown which
 * is currently being created or edited.
 */
export class DrilldownState {
  /**
   * Drilldown type used to configure this drilldown.
   */
  public readonly factory: ActionFactory;

  /**
   * Opaque action factory context object excluding the `triggers` attribute.
   */
  public readonly placeContext: ActionFactoryPlaceContext<BaseActionFactoryContext>;

  /**
   * User entered name of this drilldown.
   */
  public readonly name$: BehaviorSubject<string>;

  /**
   * User entered name of this drilldown.
   */
  public readonly triggers$: BehaviorSubject<string[]>;

  /**
   * Current action factory (drilldown) configuration, i.e. drilldown
   * configuration object, which will be serialized and persisted in storage.
   */
  public readonly config$: BehaviorSubject<BaseActionConfig>;

  constructor({
    factory,
    placeContext,
    name = '',
    triggers = [],
    config = {},
  }: DrilldownStateDeps) {
    this.factory = factory;
    this.placeContext = placeContext;
    this.name$ = new BehaviorSubject<string>(name);
    this.triggers$ = new BehaviorSubject<string[]>(triggers);
    this.config$ = new BehaviorSubject<BaseActionConfig>(config);
  }

  /**
   * Change the name of the drilldown.
   */
  public readonly setName = (name: string): void => {
    this.name$.next(name);
  };

  /**
   * Change the list of user selected triggers.
   */
  public readonly setTriggers = (triggers: string[]): void => {
    this.triggers$.next(triggers);
  };

  /**
   * Update the current drilldown configuration.
   */
  public readonly setConfig = (config: BaseActionConfig): void => {
    this.config$.next(config);
  };

  public getFactoryContext(): BaseActionFactoryContext {
    return {
      ...this.placeContext,
      triggers: this.triggers$.getValue(),
    };
  }

  // Below are convenience React hooks for consuming observables in connected
  // React components.

  /* eslint-disable react-hooks/rules-of-hooks */
  public readonly useName = () => useObservable(this.name$, this.name$.getValue());
  public readonly useTriggers = () => useObservable(this.triggers$, this.triggers$.getValue());
  public readonly useConfig = () => useObservable(this.config$, this.config$.getValue());
  /* eslint-enable react-hooks/rules-of-hooks */
}
