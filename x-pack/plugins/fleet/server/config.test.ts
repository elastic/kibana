/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';

import { config } from './config';
import { appContextService } from './services';

jest.mock('./services/app_context');

describe('Config schema', () => {
  beforeEach(() => {
    const mockedLogger = loggingSystemMock.createLogger();
    jest.mocked(appContextService.getLogger).mockReturnValue(mockedLogger);
  });
  it('should not allow to specify both default output in xpack.fleet.ouputs and xpack.fleet.agents.elasticsearch.hosts ', () => {
    expect(() => {
      config.schema.validate({
        agents: { elasticsearch: { hosts: ['https://elasticsearch:9200'] } },
        outputs: [
          {
            id: 'test',
            name: 'test output',
            type: 'elasticsearch',
            hosts: ['http://elasticsearch:9200'],
            is_default: true,
            is_default_monitoring: true,
          },
        ],
      });
    }).toThrowErrorMatchingInlineSnapshot(
      `"xpack.fleet.agents.elasticsearch.hosts should not be used when defining default outputs in xpack.fleet.outputs, please remove it."`
    );
  });

  it('should allow to specify both outputs in xpack.fleet.ouputs without default outputs and xpack.fleet.agents.elasticsearch.hosts ', () => {
    expect(() => {
      config.schema.validate({
        agents: { elasticsearch: { hosts: ['https://elasticsearch:9200'] } },
        outputs: [
          {
            id: 'test',
            name: 'test output',
            type: 'elasticsearch',
            hosts: ['http://elasticsearch:9200'],
            is_default: false,
            is_default_monitoring: false,
          },
        ],
      });
    }).not.toThrow();
  });

  it('should allow to specify default outputs only xpack.fleet.ouputs ', () => {
    expect(() => {
      config.schema.validate({
        outputs: [
          {
            id: 'test',
            name: 'test output',
            type: 'elasticsearch',
            hosts: ['http://elasticsearch:9200'],
            is_default: true,
            is_default_monitoring: true,
          },
        ],
      });
    }).not.toThrow();
  });

  it('should allow to specify default output only in xpack.fleet.agents.elasticsearch.hosts ', () => {
    expect(() => {
      config.schema.validate({
        agents: { elasticsearch: { hosts: ['https://elasticsearch:9200'] } },
      });
    }).not.toThrow();
  });

  it('should log a warning when trying to enable a non existing experimental feature', () => {
    expect(() => {
      config.schema.validate({
        enableExperimental: ['notvalid'],
      });
    }).not.toThrow();

    expect(appContextService.getLogger().warn).toBeCalledWith(
      '[notvalid] is not a valid fleet experimental feature.'
    );
  });

  it('should not log a warning when enabling an existing experimental feature', () => {
    expect(() => {
      config.schema.validate({
        enableExperimental: ['displayAgentMetrics'],
      });
    }).not.toThrow();

    expect(appContextService.getLogger().warn).not.toBeCalled();
  });
});
