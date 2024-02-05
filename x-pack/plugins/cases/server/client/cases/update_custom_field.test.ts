/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CustomFieldTypes } from '../../../common/types/domain';
import { mockCases } from '../../mocks';
import { createCasesClientMock, createCasesClientMockArgs } from '../mocks';
import { updateCustomField } from './update_custom_field';

describe('Update custom field', () => {
  const customFields = [
    {
      key: 'first_key',
      type: CustomFieldTypes.TEXT as const,
      value: 'this is a text field value',
    },
    {
      key: 'second_key',
      type: CustomFieldTypes.TOGGLE as const,
      value: null,
    },
  ];

  const theCase = { ...mockCases[0], attributes: { ...mockCases[0].attributes, customFields } };
  const clientArgs = createCasesClientMockArgs();
  const casesClient = createCasesClientMock();

  beforeEach(() => {
    jest.clearAllMocks();
    clientArgs.services.caseService.getCase.mockResolvedValue({ ...theCase });

    casesClient.configure.get = jest.fn().mockResolvedValue([
      {
        owner: mockCases[0].attributes.owner,
        customFields: [
          {
            key: 'first_key',
            type: CustomFieldTypes.TEXT,
            label: 'missing field 1',
            required: true,
          },
          {
            key: 'second_key',
            type: CustomFieldTypes.TOGGLE,
            label: 'foo',
            required: false,
          },
        ],
      },
    ]);
  });

  it('can update text customField', async () => {
    const customField = {
      type: CustomFieldTypes.TEXT as const,
      value: 'Updated text field value',
    };

    clientArgs.services.caseService.patchCase.mockResolvedValue({
      ...theCase,
    });

    await expect(
      updateCustomField(
        {
          caseId: theCase.id,
          customFieldId: 'first_key',
          customFieldPatchDetails: {
            version: theCase.version ?? '',
            customFieldDetails: customField,
          },
        },
        clientArgs,
        casesClient
      )
    ).resolves.not.toThrow();

    expect(clientArgs.services.caseService.patchCase).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: theCase.id,
        version: theCase.version,
        originalCase: {
          ...theCase,
        },
        updatedAttributes: {
          customFields: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TEXT as const,
              value: 'Updated text field value',
            },
            {
              key: 'second_key',
              type: CustomFieldTypes.TOGGLE as const,
              value: null,
            },
          ],
          updated_at: expect.any(String),
          updated_by: expect.any(Object),
        },
        refresh: false,
      })
    );
  });

  it('can update toggle customField', async () => {
    const customField = {
      type: CustomFieldTypes.TOGGLE as const,
      value: true,
    };

    clientArgs.services.caseService.patchCase.mockResolvedValue({
      ...theCase,
    });

    await expect(
      updateCustomField(
        {
          caseId: theCase.id,
          customFieldId: 'second_key',
          customFieldPatchDetails: {
            version: theCase.version ?? '',
            customFieldDetails: customField,
          },
        },
        clientArgs,
        casesClient
      )
    ).resolves.not.toThrow();

    expect(clientArgs.services.caseService.patchCase).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: theCase.id,
        version: theCase.version,
        originalCase: {
          ...theCase,
        },
        updatedAttributes: {
          customFields: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TEXT as const,
              value: 'this is a text field value',
            },
            {
              key: 'second_key',
              type: CustomFieldTypes.TOGGLE as const,
              value: true,
            },
          ],
          updated_at: expect.any(String),
          updated_by: expect.any(Object),
        },
        refresh: false,
      })
    );
  });

  it('throws error when customField value is null', async () => {
    await expect(
      updateCustomField(
        {
          caseId: mockCases[0].id,
          customFieldId: 'first_key',
          customFieldPatchDetails: {
            version: mockCases[0].version ?? '',
            customFieldDetails: {
              type: CustomFieldTypes.TEXT,
              value: null,
            },
          },
        },
        clientArgs,
        casesClient
      )
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Failed to update customField, id: first_key of case: mock-id-1 version:WzAsMV0= : Error: Custom field value cannot be null or undefined."`
    );
  });

  it('throws error when customField key is not present in configuration', async () => {
    await expect(
      updateCustomField(
        {
          caseId: mockCases[0].id,
          customFieldId: 'missing_key',
          customFieldPatchDetails: {
            version: mockCases[0].version ?? '',
            customFieldDetails: {
              type: CustomFieldTypes.TEXT,
              value: 'updated',
            },
          },
        },
        clientArgs,
        casesClient
      )
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Failed to update customField, id: missing_key of case: mock-id-1 version:WzAsMV0= : Error: Invalid custom field keys: missing_key"`
    );
  });

  it('throws error when the customField type does not match the configuration', async () => {
    await expect(
      updateCustomField(
        {
          caseId: mockCases[0].id,
          customFieldId: 'second_key',
          customFieldPatchDetails: {
            version: mockCases[0].version ?? '',
            customFieldDetails: {
              type: CustomFieldTypes.TEXT,
              value: 'foobar',
            },
          },
        },
        clientArgs,
        casesClient
      )
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Failed to update customField, id: second_key of case: mock-id-1 version:WzAsMV0= : Error: The following custom fields have the wrong type in the request: second_key"`
    );
  });
});
