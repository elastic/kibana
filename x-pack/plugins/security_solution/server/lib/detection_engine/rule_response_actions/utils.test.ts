/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getProcessAlerts } from './utils';
import type { AlertWithAgent } from './types';

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
describe('EndpointResponseActionsUtils: getProcessAlerts', () => {
  // Casted as unknown first because we do not need all the data to test the functionality
  const alerts = [alert, alert2, alert3, alert4, alert5] as unknown as AlertWithAgent[];

  it('should return actions that are valid based on default field (pid)', async () => {
    const processAlerts = getProcessAlerts(
      alerts,
      {
        overwrite: true,
        field: '',
      },
      false
    );

    const result = {
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
        alert_ids: ['alert2', 'alert3'],
        endpoint_ids: ['agent-id-2', 'agent-id-1'],
        hosts: {
          'agent-id-1': {
            id: 'agent-id-1',
            name: 'jammy-1',
          },
          'agent-id-2': {
            id: 'agent-id-2',
            name: 'jammy-2',
          },
        },
        parameters: {
          pid: 2,
        },
      },
    };
    expect(processAlerts).toEqual(result);
  });
  it('should return actions that do not have value from default field (pid)', async () => {
    const processAlerts = getProcessAlerts(
      alerts,
      {
        overwrite: true,
        field: '',
      },
      true
    );

    const result = {
      'process.pid': {
        alert_ids: ['alert4', 'alert5'],
        endpoint_ids: ['agent-id-1'],
        error: 'process.pid',
        hosts: {
          'agent-id-1': {
            id: 'agent-id-1',
            name: 'jammy-1',
          },
        },
        parameters: {
          pid: 'process.pid not found',
        },
      },
    };
    expect(processAlerts).toEqual(result);
  });
  it('should return actions that are valid based on custom field name', async () => {
    const processAlerts = getProcessAlerts(
      alerts,
      {
        overwrite: false,
        field: 'process.entity_id',
      },
      false
    );

    const result = {
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
    };
    expect(processAlerts).toEqual(result);
  });
  it('should return actions that do not have value from custom field name', async () => {
    const processAlerts = getProcessAlerts(
      alerts,
      {
        overwrite: false,
        field: 'process.entity_id',
      },
      true
    );

    const result = {
      'process.entity_id': {
        alert_ids: ['alert1', 'alert2', 'alert3', 'alert4'],
        endpoint_ids: ['agent-id-1', 'agent-id-2'],
        error: 'process.entity_id',
        hosts: {
          'agent-id-1': {
            id: 'agent-id-1',
            name: 'jammy-1',
          },
          'agent-id-2': {
            id: 'agent-id-2',
            name: 'jammy-2',
          },
        },
        parameters: {
          entity_id: 'process.entity_id not found',
        },
      },
    };
    expect(processAlerts).toEqual(result);
  });
});
