/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadFixtureEvents } from '../test_helpers/load_fixture';
import { createFakeSessionFactory } from '../test_helpers/fake_replayer_session';
import { describeReplayerSessionContract } from './session_contract';

const events = loadFixtureEvents('checkout_flow');
const last = events[events.length - 1];

describeReplayerSessionContract('fake', () => createFakeSessionFactory().factory, {
  events,
  laterEvent: { ...last, timestamp: last.timestamp + 60_000 },
  viewport: { width: 1000, height: 640 },
});
