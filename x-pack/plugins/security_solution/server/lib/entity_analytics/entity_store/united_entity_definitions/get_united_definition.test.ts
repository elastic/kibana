/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUnitedEntityDefinition } from './get_united_definition';

describe('getUnitedEntityDefinition', () => {
  const indexPatterns = ['test*'];
  describe('host', () => {
    const unitedDefinition = getUnitedEntityDefinition({
      entityType: 'host',
      namespace: 'test',
      fieldHistoryLength: 10,
      indexPatterns,
      syncDelay: '1m',
      frequency: '1m',
    });

    it('mapping', () => {
      expect(unitedDefinition.indexMappings).toMatchInlineSnapshot(`
        Object {
          "properties": Object {
            "@timestamp": Object {
              "type": "date",
            },
            "asset.criticality": Object {
              "type": "keyword",
            },
            "entity.name": Object {
              "fields": Object {
                "text": Object {
                  "type": "match_only_text",
                },
              },
              "type": "keyword",
            },
            "entity.source": Object {
              "type": "keyword",
            },
            "host.architecture": Object {
              "type": "keyword",
            },
            "host.domain": Object {
              "type": "keyword",
            },
            "host.hostname": Object {
              "type": "keyword",
            },
            "host.id": Object {
              "type": "keyword",
            },
            "host.ip": Object {
              "type": "ip",
            },
            "host.mac": Object {
              "type": "keyword",
            },
            "host.name": Object {
              "fields": Object {
                "text": Object {
                  "type": "match_only_text",
                },
              },
              "type": "keyword",
            },
            "host.os.name": Object {
              "fields": Object {
                "text": Object {
                  "type": "match_only_text",
                },
              },
              "type": "keyword",
            },
            "host.os.type": Object {
              "type": "keyword",
            },
            "host.risk.calculated_level": Object {
              "type": "keyword",
            },
            "host.risk.calculated_score": Object {
              "type": "float",
            },
            "host.risk.calculated_score_norm": Object {
              "type": "float",
            },
            "host.type": Object {
              "type": "keyword",
            },
          },
        }
      `);
    });
    it('fieldRetentionDefinition', () => {
      expect(unitedDefinition.fieldRetentionDefinition).toMatchInlineSnapshot(`
        Object {
          "entityType": "host",
          "fields": Array [
            Object {
              "field": "host.domain",
              "maxLength": 10,
              "operation": "collect_values",
            },
            Object {
              "field": "host.hostname",
              "maxLength": 10,
              "operation": "collect_values",
            },
            Object {
              "field": "host.id",
              "maxLength": 10,
              "operation": "collect_values",
            },
            Object {
              "field": "host.os.name",
              "maxLength": 10,
              "operation": "collect_values",
            },
            Object {
              "field": "host.os.type",
              "maxLength": 10,
              "operation": "collect_values",
            },
            Object {
              "field": "host.ip",
              "maxLength": 10,
              "operation": "collect_values",
            },
            Object {
              "field": "host.mac",
              "maxLength": 10,
              "operation": "collect_values",
            },
            Object {
              "field": "host.type",
              "maxLength": 10,
              "operation": "collect_values",
            },
            Object {
              "field": "host.architecture",
              "maxLength": 10,
              "operation": "collect_values",
            },
            Object {
              "field": "entity.source",
              "operation": "prefer_oldest_value",
            },
            Object {
              "field": "asset.criticality",
              "operation": "prefer_newest_value",
            },
            Object {
              "field": "host.risk.calculated_level",
              "operation": "prefer_newest_value",
            },
            Object {
              "field": "host.risk.calculated_score",
              "operation": "prefer_newest_value",
            },
            Object {
              "field": "host.risk.calculated_score_norm",
              "operation": "prefer_newest_value",
            },
          ],
          "matchField": "host.name",
        }
      `);
    });
    it('entityManagerDefinition', () => {
      expect(unitedDefinition.entityManagerDefinition).toMatchInlineSnapshot(`
        Object {
          "displayNameTemplate": "{{host.name}}",
          "id": "security_host_test",
          "identityFields": Array [
            Object {
              "field": "host.name",
              "optional": false,
            },
          ],
          "indexPatterns": Array [
            "test*",
          ],
          "latest": Object {
            "lookbackPeriod": "24h",
            "settings": Object {
              "frequency": "1m",
              "syncDelay": "1m",
            },
            "timestampField": "@timestamp",
          },
          "managed": true,
          "metadata": Array [
            Object {
              "aggregation": Object {
                "limit": 10,
                "type": "terms",
              },
              "destination": "host.domain",
              "source": "host.domain",
            },
            Object {
              "aggregation": Object {
                "limit": 10,
                "type": "terms",
              },
              "destination": "host.hostname",
              "source": "host.hostname",
            },
            Object {
              "aggregation": Object {
                "limit": 10,
                "type": "terms",
              },
              "destination": "host.id",
              "source": "host.id",
            },
            Object {
              "aggregation": Object {
                "limit": 10,
                "type": "terms",
              },
              "destination": "host.os.name",
              "source": "host.os.name",
            },
            Object {
              "aggregation": Object {
                "limit": 10,
                "type": "terms",
              },
              "destination": "host.os.type",
              "source": "host.os.type",
            },
            Object {
              "aggregation": Object {
                "limit": 10,
                "type": "terms",
              },
              "destination": "host.ip",
              "source": "host.ip",
            },
            Object {
              "aggregation": Object {
                "limit": 10,
                "type": "terms",
              },
              "destination": "host.mac",
              "source": "host.mac",
            },
            Object {
              "aggregation": Object {
                "limit": 10,
                "type": "terms",
              },
              "destination": "host.type",
              "source": "host.type",
            },
            Object {
              "aggregation": Object {
                "limit": 10,
                "type": "terms",
              },
              "destination": "host.architecture",
              "source": "host.architecture",
            },
            Object {
              "aggregation": Object {
                "sort": Object {
                  "@timestamp": "asc",
                },
                "type": "top_value",
              },
              "destination": "entity.source",
              "source": "_index",
            },
            Object {
              "aggregation": Object {
                "sort": Object {
                  "@timestamp": "desc",
                },
                "type": "top_value",
              },
              "destination": "asset.criticality",
              "source": "asset.criticality",
            },
            Object {
              "aggregation": Object {
                "sort": Object {
                  "@timestamp": "desc",
                },
                "type": "top_value",
              },
              "destination": "host.risk.calculated_level",
              "source": "host.risk.calculated_level",
            },
            Object {
              "aggregation": Object {
                "sort": Object {
                  "@timestamp": "desc",
                },
                "type": "top_value",
              },
              "destination": "host.risk.calculated_score",
              "source": "host.risk.calculated_score",
            },
            Object {
              "aggregation": Object {
                "sort": Object {
                  "@timestamp": "desc",
                },
                "type": "top_value",
              },
              "destination": "host.risk.calculated_score_norm",
              "source": "host.risk.calculated_score_norm",
            },
          ],
          "name": "Security 'host' Entity Store Definition",
          "type": "host",
          "version": "1.0.0",
        }
      `);
    });
  });
  describe('user', () => {
    const unitedDefinition = getUnitedEntityDefinition({
      entityType: 'user',
      namespace: 'test',
      fieldHistoryLength: 10,
      indexPatterns,
      syncDelay: '1m',
      frequency: '1m',
    });

    it('mapping', () => {
      expect(unitedDefinition.indexMappings).toMatchInlineSnapshot(`
        Object {
          "properties": Object {
            "@timestamp": Object {
              "type": "date",
            },
            "asset.criticality": Object {
              "type": "keyword",
            },
            "entity.name": Object {
              "fields": Object {
                "text": Object {
                  "type": "match_only_text",
                },
              },
              "type": "keyword",
            },
            "entity.source": Object {
              "type": "keyword",
            },
            "user.domain": Object {
              "type": "keyword",
            },
            "user.email": Object {
              "type": "keyword",
            },
            "user.full_name": Object {
              "fields": Object {
                "text": Object {
                  "type": "match_only_text",
                },
              },
              "type": "keyword",
            },
            "user.hash": Object {
              "type": "keyword",
            },
            "user.id": Object {
              "type": "keyword",
            },
            "user.name": Object {
              "fields": Object {
                "text": Object {
                  "type": "match_only_text",
                },
              },
              "type": "keyword",
            },
            "user.risk.calculated_level": Object {
              "type": "keyword",
            },
            "user.risk.calculated_score": Object {
              "type": "float",
            },
            "user.risk.calculated_score_norm": Object {
              "type": "float",
            },
            "user.roles": Object {
              "type": "keyword",
            },
          },
        }
      `);
    });
    it('fieldRetentionDefinition', () => {
      expect(unitedDefinition.fieldRetentionDefinition).toMatchInlineSnapshot(`
        Object {
          "entityType": "user",
          "fields": Array [
            Object {
              "field": "user.domain",
              "maxLength": 10,
              "operation": "collect_values",
            },
            Object {
              "field": "user.email",
              "maxLength": 10,
              "operation": "collect_values",
            },
            Object {
              "field": "user.full_name",
              "maxLength": 10,
              "operation": "collect_values",
            },
            Object {
              "field": "user.hash",
              "maxLength": 10,
              "operation": "collect_values",
            },
            Object {
              "field": "user.id",
              "maxLength": 10,
              "operation": "collect_values",
            },
            Object {
              "field": "user.roles",
              "maxLength": 10,
              "operation": "collect_values",
            },
            Object {
              "field": "entity.source",
              "operation": "prefer_oldest_value",
            },
            Object {
              "field": "asset.criticality",
              "operation": "prefer_newest_value",
            },
            Object {
              "field": "user.risk.calculated_level",
              "operation": "prefer_newest_value",
            },
            Object {
              "field": "user.risk.calculated_score",
              "operation": "prefer_newest_value",
            },
            Object {
              "field": "user.risk.calculated_score_norm",
              "operation": "prefer_newest_value",
            },
          ],
          "matchField": "user.name",
        }
      `);
    });
    it('entityManagerDefinition', () => {
      expect(unitedDefinition.entityManagerDefinition).toMatchInlineSnapshot(`
        Object {
          "displayNameTemplate": "{{user.name}}",
          "id": "security_user_test",
          "identityFields": Array [
            Object {
              "field": "user.name",
              "optional": false,
            },
          ],
          "indexPatterns": Array [
            "test*",
          ],
          "latest": Object {
            "lookbackPeriod": "24h",
            "settings": Object {
              "frequency": "1m",
              "syncDelay": "1m",
            },
            "timestampField": "@timestamp",
          },
          "managed": true,
          "metadata": Array [
            Object {
              "aggregation": Object {
                "limit": 10,
                "type": "terms",
              },
              "destination": "user.domain",
              "source": "user.domain",
            },
            Object {
              "aggregation": Object {
                "limit": 10,
                "type": "terms",
              },
              "destination": "user.email",
              "source": "user.email",
            },
            Object {
              "aggregation": Object {
                "limit": 10,
                "type": "terms",
              },
              "destination": "user.full_name",
              "source": "user.full_name",
            },
            Object {
              "aggregation": Object {
                "limit": 10,
                "type": "terms",
              },
              "destination": "user.hash",
              "source": "user.hash",
            },
            Object {
              "aggregation": Object {
                "limit": 10,
                "type": "terms",
              },
              "destination": "user.id",
              "source": "user.id",
            },
            Object {
              "aggregation": Object {
                "limit": 10,
                "type": "terms",
              },
              "destination": "user.roles",
              "source": "user.roles",
            },
            Object {
              "aggregation": Object {
                "sort": Object {
                  "@timestamp": "asc",
                },
                "type": "top_value",
              },
              "destination": "entity.source",
              "source": "_index",
            },
            Object {
              "aggregation": Object {
                "sort": Object {
                  "@timestamp": "desc",
                },
                "type": "top_value",
              },
              "destination": "asset.criticality",
              "source": "asset.criticality",
            },
            Object {
              "aggregation": Object {
                "sort": Object {
                  "@timestamp": "desc",
                },
                "type": "top_value",
              },
              "destination": "user.risk.calculated_level",
              "source": "user.risk.calculated_level",
            },
            Object {
              "aggregation": Object {
                "sort": Object {
                  "@timestamp": "desc",
                },
                "type": "top_value",
              },
              "destination": "user.risk.calculated_score",
              "source": "user.risk.calculated_score",
            },
            Object {
              "aggregation": Object {
                "sort": Object {
                  "@timestamp": "desc",
                },
                "type": "top_value",
              },
              "destination": "user.risk.calculated_score_norm",
              "source": "user.risk.calculated_score_norm",
            },
          ],
          "name": "Security 'user' Entity Store Definition",
          "type": "user",
          "version": "1.0.0",
        }
      `);
    });
  });
});
