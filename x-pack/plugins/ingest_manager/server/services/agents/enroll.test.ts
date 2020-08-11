/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { validateAgentVersion } from './enroll';
import { appContextService } from '../app_context';
import { IngestManagerAppContext } from '../../plugin';

describe('validateAgentVersion', () => {
  it('should throw with agent > kibana version', () => {
    appContextService.start(({
      kibanaVersion: '8.0.0',
    } as unknown) as IngestManagerAppContext);
    expect(() =>
      validateAgentVersion({
        local: { elastic: { agent: { version: '8.8.0' } } },
        userProvided: {},
      })
    ).toThrowError(/Agent version is not compatible with kibana version/);
  });
  it('should work with agent < kibana version', () => {
    appContextService.start(({
      kibanaVersion: '8.0.0',
    } as unknown) as IngestManagerAppContext);
    validateAgentVersion({ local: { elastic: { agent: { version: '7.8.0' } } }, userProvided: {} });
  });

  it('should work with agent = kibana version', () => {
    appContextService.start(({
      kibanaVersion: '8.0.0',
    } as unknown) as IngestManagerAppContext);
    validateAgentVersion({ local: { elastic: { agent: { version: '8.0.0' } } }, userProvided: {} });
  });

  it('should work with SNAPSHOT version', () => {
    appContextService.start(({
      kibanaVersion: '8.0.0-SNAPSHOT',
    } as unknown) as IngestManagerAppContext);
    validateAgentVersion({
      local: { elastic: { agent: { version: '8.0.0-SNAPSHOT' } } },
      userProvided: {},
    });
  });

  it('should work with a agent using SNAPSHOT version', () => {
    appContextService.start(({
      kibanaVersion: '7.8.0',
    } as unknown) as IngestManagerAppContext);
    validateAgentVersion({
      local: { elastic: { agent: { version: '7.8.0-SNAPSHOT' } } },
      userProvided: {},
    });
  });

  it('should work with a kibana using SNAPSHOT version', () => {
    appContextService.start(({
      kibanaVersion: '7.8.0-SNAPSHOT',
    } as unknown) as IngestManagerAppContext);
    validateAgentVersion({
      local: { elastic: { agent: { version: '7.8.0' } } },
      userProvided: {},
    });
  });
});
