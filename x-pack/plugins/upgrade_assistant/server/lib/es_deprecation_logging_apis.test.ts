/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from 'src/core/server/mocks';
import {
  getDeprecationLoggingStatus,
  isDeprecationLoggingEnabled,
  setDeprecationLogging,
  isDeprecationLogIndexingEnabled,
} from './es_deprecation_logging_apis';

describe('getDeprecationLoggingStatus', () => {
  it('calls cluster.getSettings', async () => {
    const dataClient = elasticsearchServiceMock.createScopedClusterClient();
    await getDeprecationLoggingStatus(dataClient);
    expect(dataClient.asCurrentUser.cluster.getSettings).toHaveBeenCalledWith({
      include_defaults: true,
    });
  });
});

describe('setDeprecationLogging', () => {
  describe('isEnabled = true', () => {
    it('calls cluster.putSettings with logger.deprecation = WARN', async () => {
      const dataClient = elasticsearchServiceMock.createScopedClusterClient();
      await setDeprecationLogging(dataClient, true);
      expect(dataClient.asCurrentUser.cluster.putSettings).toHaveBeenCalledWith({
        body: {
          persistent: {
            'logger.deprecation': 'WARN',
            'cluster.deprecation_indexing.enabled': true,
          },
          transient: {
            'logger.deprecation': 'WARN',
            'cluster.deprecation_indexing.enabled': true,
          },
        },
      });
    });
  });

  describe('isEnabled = false', () => {
    it('calls cluster.putSettings with logger.deprecation = ERROR', async () => {
      const dataClient = elasticsearchServiceMock.createScopedClusterClient();
      await setDeprecationLogging(dataClient, false);
      expect(dataClient.asCurrentUser.cluster.putSettings).toHaveBeenCalledWith({
        body: {
          persistent: {
            'logger.deprecation': 'ERROR',
            'cluster.deprecation_indexing.enabled': false,
          },
          transient: {
            'logger.deprecation': 'ERROR',
            'cluster.deprecation_indexing.enabled': false,
          },
        },
      });
    });
  });
});

describe('isDeprecationLoggingEnabled', () => {
  ['defaults', 'persistent', 'transient'].forEach((tier) => {
    ['ALL', 'TRACE', 'DEBUG', 'INFO', 'WARN', 'ALL'].forEach((level) => {
      it(`returns true when ${tier} is set to ${level}`, () => {
        expect(isDeprecationLoggingEnabled({ [tier]: { logger: { deprecation: level } } })).toBe(
          true
        );
      });
    });
  });

  ['defaults', 'persistent', 'transient'].forEach((tier) => {
    ['ERROR', 'FATAL'].forEach((level) => {
      it(`returns false when ${tier} is set to ${level}`, () => {
        expect(isDeprecationLoggingEnabled({ [tier]: { logger: { deprecation: level } } })).toBe(
          false
        );
      });
    });
  });

  it('allows transient to override persistent and default', () => {
    expect(
      isDeprecationLoggingEnabled({
        defaults: { logger: { deprecation: 'FATAL' } },
        persistent: { logger: { deprecation: 'FATAL' } },
        transient: { logger: { deprecation: 'WARN' } },
      })
    ).toBe(true);
  });

  it('allows persistent to override default', () => {
    expect(
      isDeprecationLoggingEnabled({
        defaults: { logger: { deprecation: 'FATAL' } },
        persistent: { logger: { deprecation: 'WARN' } },
      })
    ).toBe(true);
  });
});

describe('isDeprecationLogIndexingEnabled', () => {
  it('allows transient to override persistent and default', () => {
    expect(
      isDeprecationLogIndexingEnabled({
        defaults: { cluster: { deprecation_indexing: { enabled: 'false' } } },
        persistent: { cluster: { deprecation_indexing: { enabled: 'false' } } },
        transient: { cluster: { deprecation_indexing: { enabled: 'true' } } },
      })
    ).toBe(true);
  });

  it('allows persistent to override default', () => {
    expect(
      isDeprecationLogIndexingEnabled({
        defaults: { cluster: { deprecation_indexing: { enabled: 'false' } } },
        persistent: { cluster: { deprecation_indexing: { enabled: 'true' } } },
      })
    ).toBe(true);
  });
});
