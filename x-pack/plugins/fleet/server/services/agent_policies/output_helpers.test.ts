/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { appContextService } from '..';
import { outputService } from '../output';

import { validateOutputForPolicy } from '.';

jest.mock('../app_context');
jest.mock('../output');

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;
const mockedOutputService = outputService as jest.Mocked<typeof outputService>;

function mockHasLicence(res: boolean) {
  mockedAppContextService.getSecurityLicense.mockReturnValue({
    hasAtLeast: () => res,
  } as any);
}

describe('validateOutputForPolicy', () => {
  describe('Without oldData (create)', () => {
    it('should allow default outputs without platinum licence', async () => {
      mockHasLicence(false);
      await validateOutputForPolicy(savedObjectsClientMock.create(), {
        data_output_id: null,
        monitoring_output_id: null,
      });
    });

    it('should allow default outputs with platinum licence', async () => {
      mockHasLicence(false);
      await validateOutputForPolicy(savedObjectsClientMock.create(), {
        data_output_id: null,
        monitoring_output_id: null,
      });
    });

    it('should not allow custom data outputs without platinum licence', async () => {
      mockHasLicence(false);
      const res = validateOutputForPolicy(savedObjectsClientMock.create(), {
        data_output_id: 'test1',
        monitoring_output_id: null,
      });
      await expect(res).rejects.toThrow(
        'Invalid licence to set per policy output, you need platinum licence'
      );
    });

    it('should not allow custom monitoring outputs without platinum licence', async () => {
      mockHasLicence(false);
      const res = validateOutputForPolicy(savedObjectsClientMock.create(), {
        data_output_id: null,
        monitoring_output_id: 'test1',
      });
      await expect(res).rejects.toThrow(
        'Invalid licence to set per policy output, you need platinum licence'
      );
    });

    it('should allow custom data output with platinum licence', async () => {
      mockHasLicence(true);
      await validateOutputForPolicy(savedObjectsClientMock.create(), {
        data_output_id: 'test1',
        monitoring_output_id: null,
      });
    });

    it('should allow custom monitoring output with platinum licence', async () => {
      mockHasLicence(true);
      await validateOutputForPolicy(savedObjectsClientMock.create(), {
        data_output_id: null,
        monitoring_output_id: 'test1',
      });
    });

    it('should allow custom outputs for managed preconfigured policy without licence', async () => {
      mockHasLicence(false);
      await validateOutputForPolicy(savedObjectsClientMock.create(), {
        is_managed: true,
        is_preconfigured: true,
        data_output_id: 'test1',
        monitoring_output_id: 'test1',
      });
    });
  });

  describe('With oldData (update)', () => {
    it('should allow default outputs without platinum licence', async () => {
      mockHasLicence(false);
      await validateOutputForPolicy(
        savedObjectsClientMock.create(),
        {
          data_output_id: null,
          monitoring_output_id: null,
        },
        {
          data_output_id: 'test1',
          monitoring_output_id: 'test1',
        }
      );
    });

    it('should not allow custom data outputs without platinum licence', async () => {
      mockHasLicence(false);
      const res = validateOutputForPolicy(
        savedObjectsClientMock.create(),
        {
          data_output_id: 'test1',
          monitoring_output_id: null,
        },
        {
          data_output_id: null,
          monitoring_output_id: null,
        }
      );
      await expect(res).rejects.toThrow(
        'Invalid licence to set per policy output, you need platinum licence'
      );
    });

    it('should not allow custom monitoring outputs without platinum licence', async () => {
      mockHasLicence(false);
      const res = validateOutputForPolicy(
        savedObjectsClientMock.create(),
        {
          data_output_id: null,
          monitoring_output_id: 'test1',
        },
        {
          data_output_id: null,
          monitoring_output_id: null,
        }
      );
      await expect(res).rejects.toThrow(
        'Invalid licence to set per policy output, you need platinum licence'
      );
    });

    it('should allow custom data output with platinum licence', async () => {
      mockHasLicence(true);
      await validateOutputForPolicy(
        savedObjectsClientMock.create(),
        {
          data_output_id: 'test1',
          monitoring_output_id: null,
        },
        {
          data_output_id: 'test1',
          monitoring_output_id: null,
        }
      );
    });

    it('should allow custom monitoring output with platinum licence', async () => {
      mockHasLicence(true);
      await validateOutputForPolicy(savedObjectsClientMock.create(), {
        data_output_id: null,
        monitoring_output_id: 'test1',
      });
    });

    it('should allow custom outputs for managed preconfigured policy without licence', async () => {
      mockHasLicence(false);
      await validateOutputForPolicy(
        savedObjectsClientMock.create(),
        {
          data_output_id: 'test1',
          monitoring_output_id: 'test1',
        },
        { is_managed: true, is_preconfigured: true }
      );
    });

    it('should allow custom outputs if they did not change without licence', async () => {
      mockHasLicence(false);
      await validateOutputForPolicy(
        savedObjectsClientMock.create(),
        {
          data_output_id: 'test1',
          monitoring_output_id: 'test1',
        },
        { data_output_id: 'test1', monitoring_output_id: 'test1' }
      );
    });

    it('should not allow APM for a logstash output', async () => {
      mockHasLicence(true);
      mockedOutputService.get.mockResolvedValue({
        type: 'logstash',
      } as any);
      await expect(
        validateOutputForPolicy(
          savedObjectsClientMock.create(),
          {
            data_output_id: 'test1',
            monitoring_output_id: 'test1',
          },
          { data_output_id: 'newdataoutput', monitoring_output_id: 'test1' },
          true // hasAPM
        )
      ).rejects.toThrow(/Logstash output is not usable with policy using the APM integration./);
    });

    it('should allow APM for an elasticsearch output', async () => {
      mockHasLicence(true);
      mockedOutputService.get.mockResolvedValue({
        type: 'elasticsearch',
      } as any);

      await validateOutputForPolicy(
        savedObjectsClientMock.create(),
        {
          data_output_id: 'test1',
          monitoring_output_id: 'test1',
        },
        { data_output_id: 'newdataoutput', monitoring_output_id: 'test1' },
        true // hasAPM
      );
    });

    it('should allow logstash output for a policy not using APM', async () => {
      mockHasLicence(true);
      mockedOutputService.get.mockResolvedValue({
        type: 'logstash',
      } as any);

      await validateOutputForPolicy(
        savedObjectsClientMock.create(),
        {
          data_output_id: 'test1',
          monitoring_output_id: 'test1',
        },
        { data_output_id: 'newdataoutput', monitoring_output_id: 'test1' },
        false // do not have APM
      );
    });
  });
});
