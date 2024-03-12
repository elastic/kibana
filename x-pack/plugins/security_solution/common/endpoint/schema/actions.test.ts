/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';

import {
  RESPONSE_ACTION_AGENT_TYPE,
  RESPONSE_ACTION_API_COMMANDS_NAMES,
  RESPONSE_ACTION_TYPE,
} from '../service/response_actions/constants';
import { createHapiReadableStreamMock } from '../../../server/endpoint/services/actions/mocks';
import type { HapiReadableStream } from '../../../server/types';
import { EndpointActionListRequestSchema, UploadActionRequestSchema } from '../../api/endpoint';
import {
  KillOrSuspendProcessRequestSchema,
  NoParametersRequestSchema,
} from '../../api/endpoint/actions/common/base';
import { ExecuteActionRequestSchema } from '../../api/endpoint/actions/execute_route';

// NOTE: Even though schemas are kept in common/api/endpoint - we keep tests here, because common/api should import from outside
describe('actions schemas', () => {
  describe('Endpoint action list API Schema', () => {
    it('should work without any query keys ', () => {
      expect(() => {
        EndpointActionListRequestSchema.query.validate({}); // no agent_ids provided
      }).not.toThrow();
    });

    it('should work with all required query params', () => {
      expect(() => {
        EndpointActionListRequestSchema.query.validate({
          page: 10,
          pageSize: 100,
          startDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
          endDate: new Date().toISOString(), // today
        });
      }).not.toThrow();
    });

    describe('page and pageSize', () => {
      it('should not work with invalid value for `page` query param', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ page: -1 });
        }).toThrow();
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ page: 0 });
        }).toThrow();
      });

      it('should not work with invalid value for `pageSize` query param', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ pageSize: 100001 });
        }).toThrow();
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ pageSize: 0 });
        }).toThrow();
      });
    });

    describe('types', () => {
      it.each(RESPONSE_ACTION_TYPE)('should accept valid %s `types`', (value) => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ types: value });
        }).not.toThrow();
      });

      it.each(RESPONSE_ACTION_TYPE.map((e) => [e]))(
        'should accept valid %s `types` as a list',
        (value) => {
          expect(() => {
            EndpointActionListRequestSchema.query.validate({ types: value });
          }).not.toThrow();
        }
      );

      it('should accept multiple valid `types` as a list', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            types: RESPONSE_ACTION_TYPE,
          });
        }).not.toThrow();
      });

      it('should not accept an empty list for `types`', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            types: [],
          });
        }).toThrow();
      });
    });

    describe('agentIds', () => {
      it('should require at least 1 agent ID', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ agentIds: [] }); // no agent_ids provided
        }).toThrow();
      });

      it('should accept an agent ID if not in an array', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ agentIds: uuidv4() });
        }).not.toThrow();
      });

      it('should accept an agent ID in an array', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ agentIds: [uuidv4()] });
        }).not.toThrow();
      });

      it('should accept multiple agent IDs in an array', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            agentIds: [uuidv4(), uuidv4(), uuidv4()],
          });
        }).not.toThrow();
      });

      it('should not limit multiple agent IDs', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            agentIds: Array(255)
              .fill(1)
              .map(() => uuidv4()),
          });
        }).not.toThrow();
      });
    });

    describe('agentTypes', () => {
      it('should accept undefined agentTypes ', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ agentTypes: undefined });
        }).not.toThrow();
      });

      it.each(RESPONSE_ACTION_AGENT_TYPE)('should accept allowed %s agentTypes ', (agentTypes) => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ agentTypes });
        }).not.toThrow();
      });

      it.each(RESPONSE_ACTION_AGENT_TYPE)(
        'should accept allowed %s agentTypes in a list',
        (agentTypes) => {
          expect(() => {
            EndpointActionListRequestSchema.query.validate({ agentTypes: [agentTypes] });
          }).not.toThrow();
        }
      );

      it('should accept allowed agentTypes in list', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            agentTypes: RESPONSE_ACTION_AGENT_TYPE,
          });
        }).not.toThrow();
      });

      it('should not accept empty agentTypes list', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ agentTypes: [] });
        }).toThrow();
      });

      it('should not accept invalid agentTypes list', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ agentTypes: ['x'] });
        }).toThrow();
      });

      it('should not accept invalid string agentTypes ', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ agentTypes: 'non-agent' });
        }).toThrow();
      });

      it('should not accept empty string agentTypes ', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ agentTypes: '' });
        }).toThrow();
      });

      it('should not accept invalid agentTypes in list', () => {
        const excludedAgentType =
          RESPONSE_ACTION_AGENT_TYPE[Math.round(Math.random() * RESPONSE_ACTION_AGENT_TYPE.length)];

        const partialAllowedAgentTypes = RESPONSE_ACTION_AGENT_TYPE.filter(
          (type) => type !== excludedAgentType
        );

        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            agentTypes: [...partialAllowedAgentTypes, 'non-agent'],
          });
        }).toThrow();
      });

      it('should not accept `undefined` agentTypes in list', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            agentTypes: [undefined],
          });
        }).toThrow();
      });
    });

    describe('userIds', () => {
      it('should not work without valid userIds', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            page: 10,
            pageSize: 100,
            startDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
            endDate: new Date().toISOString(), // today
            userIds: [],
          });
        }).toThrow();
      });

      it('should work with a single userIds query params', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            page: 10,
            pageSize: 100,
            startDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
            endDate: new Date().toISOString(), // today
            userIds: ['elastic'],
          });
        }).not.toThrow();
      });

      it('should work with multiple userIds query params', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            page: 10,
            pageSize: 100,
            startDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
            endDate: new Date().toISOString(), // today
            userIds: ['elastic', 'fleet'],
          });
        }).not.toThrow();
      });
    });

    describe('commands', () => {
      it.each(RESPONSE_ACTION_API_COMMANDS_NAMES)(
        'should work with commands query params with %s action',
        (command) => {
          expect(() => {
            EndpointActionListRequestSchema.query.validate({
              page: 10,
              pageSize: 100,
              startDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
              endDate: new Date().toISOString(), // today
              commands: command,
            });
          }).not.toThrow();
        }
      );

      it('should work with commands query params with a single action type in a list', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            page: 10,
            pageSize: 100,
            startDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
            endDate: new Date().toISOString(), // today
            commands: ['isolate'],
          });
        }).not.toThrow();
      });

      it('should not work with commands query params with empty array', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            page: 10,
            pageSize: 100,
            startDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
            endDate: new Date().toISOString(), // today
            commands: [],
          });
        }).toThrow();
      });

      it('should work with commands query params with multiple types', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            page: 10,
            pageSize: 100,
            startDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
            endDate: new Date().toISOString(), // today
            commands: ['isolate', 'unisolate'],
          });
        }).not.toThrow();
      });
    });

    describe('statuses', () => {
      it('should work with at least one `statuses` filter in a list', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            startDate: 'now-1d', // yesterday
            endDate: 'now', // today
            statuses: ['failed'],
          });
        }).not.toThrow();
      });

      it.each(['failed', 'pending', 'successful'])('should work alone with %s filter', (status) => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            startDate: 'now-1d', // yesterday
            endDate: 'now', // today
            statuses: status,
          });
        }).not.toThrow();
      });

      it('should work with at multiple `statuses` filter', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            startDate: 'now-1d', // yesterday
            endDate: 'now', // today
            statuses: ['failed', 'pending', 'successful'],
          });
        }).not.toThrow();
      });

      it('should not work with empty list for `statuses` filter', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            startDate: 'now-1d', // yesterday
            endDate: 'now', // today
            statuses: [],
          });
        }).toThrow();
      });

      it('should not work with more than allowed list for `statuses` filter', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            startDate: 'now-1d', // yesterday
            endDate: 'now', // today
            statuses: ['failed', 'pending', 'successful', 'xyz'],
          });
        }).toThrow();
      });

      it('should not work with any string for `statuses` filter', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            startDate: 'now-1d', // yesterday
            endDate: 'now', // today
            statuses: ['xyz', 'pqr', 'abc'],
          });
        }).toThrow();
      });
    });

    describe('withOutputs', () => {
      it('should not work with only spaces for a string in `withOutputs` list', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            startDate: 'now-1d', // yesterday
            endDate: 'now', // today
            statuses: ['failed', 'pending', 'successful'],
            withOutputs: '  ',
          });
        }).toThrow();
      });

      it('should not work with empty string in `withOutputs` list', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            startDate: 'now-1d', // yesterday
            endDate: 'now', // today
            statuses: ['failed', 'pending', 'successful'],
            withOutputs: '',
          });
        }).toThrow();
      });

      it('should not work with empty strings in `withOutputs` list', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            startDate: 'now-1d', // yesterday
            endDate: 'now', // today
            statuses: ['failed', 'pending', 'successful'],
            withOutputs: ['action-id-1', '  ', 'action-id-2'],
          });
        }).toThrow();
      });

      it('should work with a single action id in `withOutputs` list', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            startDate: 'now-1d', // yesterday
            endDate: 'now', // today
            statuses: ['failed', 'pending', 'successful'],
            withOutputs: 'action-id-1',
          });
        }).not.toThrow();
      });

      it('should work with multiple `withOutputs` filter', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            startDate: 'now-1d', // yesterday
            endDate: 'now', // today
            statuses: ['failed', 'pending', 'successful'],
            withOutputs: ['action-id-1', 'action-id-2'],
          });
        }).not.toThrow();
      });
    });
  });

  describe('NoParametersRequestSchema', () => {
    it('should not accept when no endpoint_ids', () => {
      expect(() => {
        NoParametersRequestSchema.body.validate({});
      }).toThrow();
    });

    it('should require at least 1 endpoint id', () => {
      expect(() => {
        NoParametersRequestSchema.body.validate({
          endpoint_ids: [],
        });
      }).toThrow();
    });

    it('should not accept empty endpoint id', () => {
      expect(() => {
        NoParametersRequestSchema.body.validate({
          endpoint_ids: [''],
        });
      }).toThrow();
    });

    it('should not accept any empty endpoint_ids in the array', () => {
      expect(() => {
        NoParametersRequestSchema.body.validate({
          endpoint_ids: ['x', ' ', 'y'],
        });
      }).toThrow();
    });

    it('should accept an Endpoint ID as the only required field', () => {
      expect(() => {
        NoParametersRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
        });
      }).not.toThrow();
    });

    it('should accept a comment', () => {
      expect(() => {
        NoParametersRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          comment: 'a user comment',
        });
      }).not.toThrow();
    });

    it('should not accept empty alert IDs', () => {
      expect(() => {
        NoParametersRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          alert_ids: [' '],
        });
      }).toThrow();
    });

    it('should accept alert IDs', () => {
      expect(() => {
        NoParametersRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          alert_ids: ['0000000-000-00'],
        });
      }).not.toThrow();
    });

    it('should not accept empty case IDs', () => {
      expect(() => {
        NoParametersRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          case_ids: [' '],
        });
      }).toThrow();
    });

    it('should accept case IDs', () => {
      expect(() => {
        NoParametersRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          case_ids: ['000000000-000-000'],
        });
      }).not.toThrow();
    });
  });

  describe('KillOrSuspendProcessRequestSchema', () => {
    it('should not accept when no endpoint_ids', () => {
      expect(() => {
        KillOrSuspendProcessRequestSchema.body.validate({});
      }).toThrow();
    });

    it('should not accept empty endpoint_ids array', () => {
      expect(() => {
        KillOrSuspendProcessRequestSchema.body.validate({
          endpoint_ids: [],
        });
      }).toThrow();
    });

    it('should not accept empty string as endpoint id', () => {
      expect(() => {
        KillOrSuspendProcessRequestSchema.body.validate({
          endpoint_ids: [' '],
        });
      }).toThrow();
    });

    it('should not accept any empty string in endpoint_ids array', () => {
      expect(() => {
        KillOrSuspendProcessRequestSchema.body.validate({
          endpoint_ids: ['x', ' ', 'y'],
        });
      }).toThrow();
    });

    it('should accept pid', () => {
      expect(() => {
        KillOrSuspendProcessRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          parameters: {
            pid: 1234,
          },
        });
      }).not.toThrow();
    });

    it('should accept entity_id', () => {
      expect(() => {
        KillOrSuspendProcessRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          parameters: {
            entity_id: 'abc123',
          },
        });
      }).not.toThrow();
    });

    it('should reject pid and entity_id together', () => {
      expect(() => {
        KillOrSuspendProcessRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          parameters: {
            pid: 1234,
            entity_id: 'abc123',
          },
        });
      }).toThrow();
    });

    it('should reject if no pid or entity_id', () => {
      expect(() => {
        KillOrSuspendProcessRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          comment: 'a user comment',
          parameters: {},
        });
      }).toThrow();
    });

    it('should accept a comment', () => {
      expect(() => {
        KillOrSuspendProcessRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          comment: 'a user comment',
          parameters: {
            pid: 1234,
          },
        });
      }).not.toThrow();
    });
  });

  describe('ExecuteActionRequestSchema', () => {
    it('should not accept when no endpoint_ids', () => {
      expect(() => {
        NoParametersRequestSchema.body.validate({});
      }).toThrow();
    });

    it('should not accept empty endpoint_ids array', () => {
      expect(() => {
        NoParametersRequestSchema.body.validate({
          endpoint_ids: [],
        });
      }).toThrow();
    });

    it('should not accept empty string as endpoint id', () => {
      expect(() => {
        NoParametersRequestSchema.body.validate({
          endpoint_ids: [' '],
        });
      }).toThrow();
    });

    it('should not accept any empty string in endpoint_ids array', () => {
      expect(() => {
        NoParametersRequestSchema.body.validate({
          endpoint_ids: ['x', ' ', 'y'],
        });
      }).toThrow();
    });

    it('should not accept an empty command with a valid endpoint_id', () => {
      expect(() => {
        NoParametersRequestSchema.body.validate({
          endpoint_ids: ['endpoint_id'],
          parameters: {
            command: '  ',
          },
        });
      }).toThrow();
    });

    it('should not accept optional negative integers for timeout with at least one endpoint_id and a command parameter', () => {
      expect(() => {
        ExecuteActionRequestSchema.body.validate({
          endpoint_ids: ['endpoint_id'],
          parameters: {
            command: 'ls -al',
            timeout: -1,
          },
        });
      }).toThrow();
    });

    it('should not accept optional invalid timeout with at least one endpoint_id and a command parameter', () => {
      expect(() => {
        ExecuteActionRequestSchema.body.validate({
          endpoint_ids: ['endpoint_id'],
          parameters: {
            command: 'ls -al',
            timeout: '',
          },
        });
      }).toThrow();
    });

    it('should accept at least one valid endpoint id and a command', () => {
      expect(() => {
        ExecuteActionRequestSchema.body.validate({
          endpoint_ids: ['endpoint_id'],
          parameters: {
            command: 'ls -al',
          },
        });
      }).not.toThrow();
    });

    it('should accept at least one endpoint_id and a command parameter', () => {
      expect(() => {
        ExecuteActionRequestSchema.body.validate({
          endpoint_ids: ['endpoint_id'],
          parameters: {
            command: 'ls -al',
          },
        });
      }).not.toThrow();
    });

    it('should also accept a valid timeout with at least one endpoint_id and a command parameter', () => {
      expect(() => {
        ExecuteActionRequestSchema.body.validate({
          endpoint_ids: ['endpoint_id'],
          parameters: {
            command: 'ls -al',
            timeout: 1000,
          },
        });
      }).not.toThrow();
    });

    it('should also accept an optional comment', () => {
      expect(() => {
        ExecuteActionRequestSchema.body.validate({
          endpoint_ids: ['endpoint_id'],
          parameters: {
            command: 'ls -al',
            timeout: 1000,
          },
          comment: 'a user comment',
        });
      }).not.toThrow();
    });
  });

  describe(`UploadActionRequestSchema`, () => {
    let fileStream: HapiReadableStream;

    beforeEach(() => {
      fileStream = createHapiReadableStreamMock();
    });

    it('should not error if `override` parameter is not defined', () => {
      expect(() => {
        UploadActionRequestSchema.body.validate({
          endpoint_ids: ['endpoint_id'],
          file: fileStream,
        });
      }).not.toThrow();
    });

    it('should allow `overwrite` parameter', () => {
      expect(() => {
        UploadActionRequestSchema.body.validate({
          endpoint_ids: ['endpoint_id'],
          parameters: {
            overwrite: true,
          },
          file: fileStream,
        });
      }).not.toThrow();
    });

    it('should error if `file` is not defined', () => {
      expect(() => {
        UploadActionRequestSchema.body.validate({
          endpoint_ids: ['endpoint_id'],
          parameters: {
            overwrite: true,
          },
        });
      }).toThrow('[file]: expected value of type [Stream] but got [undefined]');
    });

    it('should error if `file` is not a Stream', () => {
      expect(() => {
        UploadActionRequestSchema.body.validate({
          endpoint_ids: ['endpoint_id'],
          parameters: {
            overwrite: true,
          },
          file: {},
        });
      }).toThrow('[file]: expected value of type [Stream] but got [Object]');
    });
  });
});
