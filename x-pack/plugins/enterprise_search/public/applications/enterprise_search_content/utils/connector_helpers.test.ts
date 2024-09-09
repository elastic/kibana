/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Connector, ConnectorStatus } from '@kbn/search-connectors';

import { hasDocumentLevelSecurityFeature, hasIncrementalSyncFeature } from './connector_helpers';

const mockConnector: Connector = {
  api_key_id: '',
  api_key_secret_id: '',
  configuration: {},
  custom_scheduling: {},
  features: {
    incremental_sync: {
      enabled: true,
    },
    document_level_security: {
      enabled: true,
    },
  },
  description: null,
  error: null,
  filtering: [],
  id: '',
  index_name: null,
  is_native: false,
  language: null,
  last_access_control_sync_error: null,
  last_access_control_sync_scheduled_at: null,
  last_access_control_sync_status: null,
  last_deleted_document_count: null,
  last_incremental_sync_scheduled_at: null,
  last_indexed_document_count: null,
  last_seen: null,
  last_sync_error: null,
  last_sync_scheduled_at: null,
  last_sync_status: null,
  last_synced: null,
  name: '',
  scheduling: {
    access_control: {
      enabled: false,
      interval: '',
    },
    full: {
      enabled: false,
      interval: '',
    },
    incremental: {
      enabled: false,
      interval: '',
    },
  },
  service_type: null,
  status: ConnectorStatus.CREATED,
  sync_now: false,
};

describe('connector_helpers', () => {
  describe('hasIncrementalSyncFeature', () => {
    it('returns true if connector has incremental sync feature enabled', () => {
      const connector: Connector = {
        ...mockConnector,
        features: {
          incremental_sync: {
            enabled: true,
          },
        },
      };
      expect(hasIncrementalSyncFeature(connector)).toEqual(true);
    });

    it('returns false if connector does not have incremental sync feature enabled', () => {
      const connector = {
        ...mockConnector,
        features: {
          incremental_sync: {
            enabled: false,
          },
        },
      };
      expect(hasIncrementalSyncFeature(connector)).toEqual(false);
    });

    it('returns false if connector is undefined', () => {
      const connector = undefined;
      expect(hasIncrementalSyncFeature(connector)).toEqual(false);
    });
  });

  describe('hasDocumentLevelSecurityFeature', () => {
    it('returns true if connector has document level security feature enabled', () => {
      const connector = {
        ...mockConnector,
        features: {
          document_level_security: {
            enabled: true,
          },
        },
      };
      expect(hasDocumentLevelSecurityFeature(connector)).toEqual(true);
    });

    it('returns false if connector does not have document level security feature enabled', () => {
      const connector = {
        ...mockConnector,
        features: {
          document_level_security: {
            enabled: false,
          },
        },
      };
      expect(hasDocumentLevelSecurityFeature(connector)).toEqual(false);
    });

    it('returns false if connector is undefined', () => {
      const connector = undefined;
      expect(hasDocumentLevelSecurityFeature(connector)).toEqual(false);
    });
  });
});
