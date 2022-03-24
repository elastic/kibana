/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type { ConsoleProps } from '../../console';

export interface ConsoleRegistrationInterface {
  id: string;
  title: ReactNode;
  consoleProps: ConsoleProps;
  onBeforeClose?: () => void;
}

export interface RegisteredConsoleClient
  extends Pick<ConsoleRegistrationInterface, 'id' | 'title'> {
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
  getOne(id: string): Readonly<RegisteredConsoleClient> | undefined;

  /** Get a list of running consoles */
  getList(): Readonly<RegisteredConsoleClient[]>;
}
