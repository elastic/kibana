/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getErrorProcessAlerts, getIsolateAlerts, getProcessAlerts } from './utils';
import type { AlertWithAgent } from './types';

const getSampleAlerts = (): AlertWithAgent[] => {
  const alert = {
    _id: 'alert1',
    process: {
      pid: 1,
    },
    agent: {
      name: 'jammy-1',
      id: 'agent-id-1',
    },
  };
  const alert2 = {
    _id: 'alert2',
    process: {
      pid: 2,
    },
    agent: {
      name: 'jammy-2',
      id: 'agent-id-2',
    },
  };
  const alert3 = {
    _id: 'alert3',
    process: {
      pid: 2,
    },
    agent: {
      name: 'jammy-1',
      id: 'agent-id-1',
    },
  };
  const alert4 = {
    _id: 'alert4',
    agent: {
      name: 'jammy-1',
      id: 'agent-id-1',
    },
  };
  const alert5 = {
    _id: 'alert5',
    process: {
      entity_id: 2,
    },
    agent: {
      name: 'jammy-1',
      id: 'agent-id-1',
    },
  };
  // Casted as unknown first because we do not need all the data to test the functionality
  return [alert, alert2, alert3, alert4, alert5] as unknown as AlertWithAgent[];
};
describe('EndpointResponseActionsUtils', () => {
  describe('getIsolateAlerts', () => {
    const alerts = getSampleAlerts();
    it('should return proper number of actions divided per agents with specified alert_ids', async () => {
      const isolateAlerts = getIsolateAlerts(alerts);

      const result = {
        'agent-id-1': {
          alert_ids: ['alert1', 'alert3', 'alert4', 'alert5'],
          endpoint_ids: ['agent-id-1'],
          hosts: {
            'agent-id-1': {
              id: 'agent-id-1',
              name: 'jammy-1',
            },
          },
        },
        'agent-id-2': {
          alert_ids: ['alert2'],
          endpoint_ids: ['agent-id-2'],
          hosts: {
            'agent-id-2': {
              id: 'agent-id-2',
              name: 'jammy-2',
            },
          },
        },
      };
      expect(isolateAlerts).toEqual(result);
    });
  });
  describe('getProcessAlerts', () => {
    const alerts = getSampleAlerts();

    it('should return actions that are valid based on default field (pid)', async () => {
      const processAlerts = getProcessAlerts(alerts, {
        overwrite: true,
        field: '',
      });

      const result = {
        'agent-id-1': {
          '1': {
            alert_ids: ['alert1'],
            endpoint_ids: ['agent-id-1'],
            hosts: {
              'agent-id-1': {
                id: 'agent-id-1',
                name: 'jammy-1',
              },
            },
            parameters: {
              pid: 1,
            },
          },
          '2': {
            alert_ids: ['alert3'],
            endpoint_ids: ['agent-id-1'],
            hosts: {
              'agent-id-1': {
                id: 'agent-id-1',
                name: 'jammy-1',
              },
            },
            parameters: {
              pid: 2,
            },
          },
        },
        'agent-id-2': {
          '2': {
            alert_ids: ['alert2'],
            endpoint_ids: ['agent-id-2'],
            hosts: {
              'agent-id-2': {
                id: 'agent-id-2',
                name: 'jammy-2',
              },
            },
            parameters: {
              pid: 2,
            },
          },
        },
      };
      expect(processAlerts).toEqual(result);
    });

    it('should return actions that do not have value from default field (pid)', async () => {
      const processAlerts = getProcessAlerts(alerts, {
        overwrite: false,
        field: 'process.entity_id',
      });

      const result = {
        'agent-id-1': {
          '2': {
            alert_ids: ['alert5'],
            endpoint_ids: ['agent-id-1'],
            hosts: {
              'agent-id-1': {
                id: 'agent-id-1',
                name: 'jammy-1',
              },
            },
            parameters: {
              entity_id: 2,
            },
          },
        },
      };
      expect(processAlerts).toEqual(result);
    });
  });
  describe('getErrorProcessAlerts', () => {
    const alerts = getSampleAlerts();

    it('should return actions that do not have value from default field (pid)', async () => {
      const processAlerts = getErrorProcessAlerts(alerts, {
        overwrite: true,
        field: '',
      });

      const result = {
        'agent-id-1': {
          'process.pid': {
            alert_ids: ['alert4', 'alert5'],
            endpoint_ids: ['agent-id-1'],
            error: 'The action was called with a non-existing event field name: process.pid',
            hosts: {
              'agent-id-1': {
                id: 'agent-id-1',
                name: 'jammy-1',
              },
            },
            parameters: {},
          },
        },
      };
      expect(processAlerts).toEqual(result);
    });
    it('should return actions that do not have value from custom field name', async () => {
      const processAlerts = getErrorProcessAlerts(alerts, {
        overwrite: false,
        field: 'process.entity_id',
      });

      const result = {
        'agent-id-1': {
          'process.entity_id': {
            alert_ids: ['alert1', 'alert3', 'alert4'],
            endpoint_ids: ['agent-id-1'],
            error: 'The action was called with a non-existing event field name: process.entity_id',
            hosts: {
              'agent-id-1': {
                id: 'agent-id-1',
                name: 'jammy-1',
              },
            },
            parameters: {},
          },
        },
        'agent-id-2': {
          'process.entity_id': {
            alert_ids: ['alert2'],
            endpoint_ids: ['agent-id-2'],
            error: 'The action was called with a non-existing event field name: process.entity_id',
            hosts: {
              'agent-id-2': {
                id: 'agent-id-2',
                name: 'jammy-2',
              },
            },
            parameters: {},
          },
        },
      };
      expect(processAlerts).toEqual(result);
    });
  });
});
