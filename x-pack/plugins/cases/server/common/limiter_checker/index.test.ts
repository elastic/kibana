/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentLimitChecker } from '.';
import { createAttachmentServiceMock } from '../../services/mocks';
import { createAlertRequests, createFileRequests, createUserRequests } from './test_utils';

describe('AttachmentLimitChecker', () => {
  const mockAttachmentService = createAttachmentServiceMock();
  const checker = new AttachmentLimitChecker(mockAttachmentService, 'id');

  beforeEach(() => {
    jest.clearAllMocks();

    mockAttachmentService.executeCaseAggregations.mockImplementation(async () => {
      return {
        limiter: {
          value: 5,
        },
      };
    });
  });

  describe('validate', () => {
    it('does not throw when called with an empty array', async () => {
      expect.assertions(1);

      await expect(checker.validate([])).resolves.not.toThrow();
    });

    it('does not throw when none of the requests are alerts or files', async () => {
      expect.assertions(1);

      await expect(checker.validate(createUserRequests(2))).resolves.not.toThrow();
    });

    describe('files', () => {
      it('throws when the files in a single request are greater than 100', async () => {
        expect.assertions(1);

        await expect(
          checker.validate(createFileRequests({ numRequests: 1, numFiles: 101 }))
        ).rejects.toMatchInlineSnapshot(
          `[Error: Case has reached the maximum allowed number (100) of attached files.]`
        );
      });

      it('throws when there are 101 requests with a single file', async () => {
        expect.assertions(1);

        await expect(
          checker.validate(createFileRequests({ numRequests: 101, numFiles: 1 }))
        ).rejects.toMatchInlineSnapshot(
          `[Error: Case has reached the maximum allowed number (100) of attached files.]`
        );
      });

      it('does not throw when the sum of the file requests and files within the case are only 100', async () => {
        expect.assertions(1);

        await expect(
          checker.validate(createFileRequests({ numFiles: 1, numRequests: 95 }))
        ).resolves.not.toThrow();
      });

      it('throws when the sum of the file requests and files within the case are 101', async () => {
        expect.assertions(1);

        await expect(
          checker.validate(createFileRequests({ numFiles: 1, numRequests: 96 }))
        ).rejects.toMatchInlineSnapshot(
          `[Error: Case has reached the maximum allowed number (100) of attached files.]`
        );
      });

      it('throws when the sum of the file requests and files within the case are 101 with a single file request', async () => {
        expect.assertions(1);

        await expect(
          checker.validate(createFileRequests({ numFiles: 96, numRequests: 1 }))
        ).rejects.toMatchInlineSnapshot(
          `[Error: Case has reached the maximum allowed number (100) of attached files.]`
        );
      });
    });

    describe('alerts', () => {
      it('throws when the alerts in a single request are greater than 1000', async () => {
        expect.assertions(1);

        const alertIds = [...Array(1001).keys()].map((key) => `${key}`);
        await expect(
          checker.validate(createAlertRequests(1, alertIds))
        ).rejects.toMatchInlineSnapshot(
          `[Error: Case has reached the maximum allowed number (1000) of attached alerts.]`
        );
      });

      it('throws when there are 1001 requests with a single alert id', async () => {
        expect.assertions(1);

        await expect(
          checker.validate(createAlertRequests(1001, 'alertId'))
        ).rejects.toMatchInlineSnapshot(
          `[Error: Case has reached the maximum allowed number (1000) of attached alerts.]`
        );
      });

      it('does not throw when the sum of the alert requests and alerts within the case are only 1000', async () => {
        expect.assertions(1);

        await expect(checker.validate(createAlertRequests(995, 'alertId'))).resolves.not.toThrow();
      });

      it('throws when the sum of the alert requests and alerts within the case are 1001', async () => {
        expect.assertions(1);

        await expect(
          checker.validate(createAlertRequests(996, 'alertId'))
        ).rejects.toMatchInlineSnapshot(
          `[Error: Case has reached the maximum allowed number (1000) of attached alerts.]`
        );
      });

      it('throws when the sum of the alert requests and alerts within the case are 1001 with a single request', async () => {
        expect.assertions(1);

        const alertIds = [...Array(996).keys()].map((key) => `${key}`);

        await expect(
          checker.validate(createAlertRequests(1, alertIds))
        ).rejects.toMatchInlineSnapshot(
          `[Error: Case has reached the maximum allowed number (1000) of attached alerts.]`
        );
      });
    });
  });
});
