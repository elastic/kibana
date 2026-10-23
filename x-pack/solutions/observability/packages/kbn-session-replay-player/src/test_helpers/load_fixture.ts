/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable import/no-nodejs-modules */
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseReplayEvents } from '../model/replay_event_guards';
import type { ReplayEvent } from '../types';

export const FIXTURES_DIR = join(__dirname, '..', '..', 'fixtures');

export const readFixtureText = (name: string): string =>
  readFileSync(join(FIXTURES_DIR, `${name}.json`), 'utf8');

/** Loads a fixture the way a host would hand it over: parsed JSON filtered to replay events. */
export const loadFixtureEvents = (name: string): ReplayEvent[] =>
  parseReplayEvents(JSON.parse(readFixtureText(name)));
