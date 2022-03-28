/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import { ConsoleProps } from '../../types';

export interface ConsoleRegistrationInterface<Meta extends object = Record<string, unknown>> {
  id: string;
  /** The title for the console popup */
  title: ReactNode;
  /**
   * Any additional metadata about the console. Helpful for when consuming Registered consoles
   * (ex. could hold the details data for the Host that the console is opened against)
   */
  meta?: Meta;
  consoleProps: ConsoleProps;
  onBeforeTerminate?: () => void;
}

export interface RegisteredConsoleClient<Meta extends object = Record<string, unknown>>
  extends Pick<ConsoleRegistrationInterface<Meta>, 'id' | 'title' | 'meta'> {
  show(): void;

  hide(): void;

  terminate(): void;
}

export interface ConsoleManagerClient {
  /** Registers a new console */
  register(console: ConsoleRegistrationInterface): Readonly<RegisteredConsoleClient>;

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
  getList<Meta extends object = Record<string, unknown>>(): Readonly<
    Array<RegisteredConsoleClient<Meta>>
  >;
}
