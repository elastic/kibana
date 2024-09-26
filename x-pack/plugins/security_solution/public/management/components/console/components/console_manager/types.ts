/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ComponentType } from 'react';
import type { ConsoleProps } from '../../types';

export interface ConsoleRegistrationInterface<TMeta extends object = any> {
  id: string;
  consoleProps: ConsoleProps;
  /**
   * Any additional metadata about the console. Helpful for when consuming Registered consoles
   * (ex. could hold the details data for the Host that the console is opened against)
   */
  meta?: TMeta;

  /** An optional component used to render the Overlay page title where the console will be displayed */
  PageTitleComponent?: ComponentType<ManagedConsoleExtensionComponentProps<TMeta>>;

  /**
   * An optional component that will be rendered in the Responder page overlay, above the Console area
   */
  x?: ComponentType<ManagedConsoleExtensionComponentProps<TMeta>>;

  /**
   * An array of Action components (likely buttons) that will be rendered into the Responder page
   * overlay header (next to the `Done` button).
   *
   * NOTE: this is an Array of `Component`'s - not `JSX`. These will be initialized/rendered when
   * the Responder page overlay is shown.
   */
  ActionComponents?: Array<ComponentType<ManagedConsoleExtensionComponentProps<TMeta>>>;

  /** controls the visibility of the console close button */
  showCloseButton?: boolean;
}

/**
 * The Props that are provided to the component constructors provided in `ConsoleRegistrationInterface`
 */
export interface ManagedConsoleExtensionComponentProps<TMeta extends object = any> {
  meta: { [key in keyof TMeta]: TMeta[key] };
}

export interface RegisteredConsoleClient<TMeta extends object = any>
  extends Pick<ConsoleRegistrationInterface<TMeta>, 'id' | 'meta'> {
  show(): void;

  hide(): void;

  terminate(): void;

  isVisible(): boolean;
}

export interface ConsoleManagerClient {
  /** Registers a new console */
  register<TMeta extends object = any>(
    console: ConsoleRegistrationInterface<TMeta>
  ): Readonly<RegisteredConsoleClient>;

  /** Opens console in a dialog */
  show(id: string): void;

  /** Hides the console (minimize) */
  hide(id: string): void;

  /** Removes the console from management and calls `onBeforeClose` if one was defined */
  terminate(id: string): void;

  /** Retrieve a running console */
  getOne<Meta extends object = Record<string, unknown>>(
    id: string
  ): Readonly<RegisteredConsoleClient<Meta>> | undefined;

  /** Get a list of running consoles */
  getList<Meta extends object = Record<string, unknown>>(): ReadonlyArray<
    Readonly<RegisteredConsoleClient<Meta>>
  >;
}
