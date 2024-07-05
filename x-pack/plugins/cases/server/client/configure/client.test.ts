/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';

import type { CasesClientArgs } from '../types';

import { getConnectors, get, update, create } from './client';
import { createCasesClientInternalMock, createCasesClientMockArgs } from '../mocks';
import {
  MAX_CUSTOM_FIELDS_PER_CASE,
  MAX_SUPPORTED_CONNECTORS_RETURNED,
  MAX_TEMPLATES_LENGTH,
} from '../../../common/constants';
import { ConnectorTypes } from '../../../common';
import type { TemplatesConfiguration } from '../../../common/types/domain';
import { CustomFieldTypes } from '../../../common/types/domain';
import type { ConfigurationRequest } from '../../../common/types/api';

describe('client', () => {
  const clientArgs = createCasesClientMockArgs();
  const casesClientInternal = createCasesClientInternalMock();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getConnectors', () => {
    const logger = loggingSystemMock.createLogger();
    const actionsClient = actionsClientMock.create();

    const args = { actionsClient, logger } as unknown as CasesClientArgs;

    const actionTypes = [
      {
        id: '.jira',
        name: '1',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        minimumLicenseRequired: 'basic' as const,
        supportedFeatureIds: ['alerting', 'cases'],
        isSystemActionType: false,
      },
      {
        id: '.servicenow',
        name: '2',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        minimumLicenseRequired: 'basic' as const,
        supportedFeatureIds: ['alerting', 'cases'],
        isSystemActionType: false,
      },
      {
        id: '.unsupported',
        name: '3',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        minimumLicenseRequired: 'basic' as const,
        supportedFeatureIds: ['alerting'],
        isSystemActionType: false,
      },
      {
        id: '.swimlane',
        name: 'swimlane',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: false,
        minimumLicenseRequired: 'basic' as const,
        supportedFeatureIds: ['alerting', 'cases'],
        isSystemActionType: false,
      },
    ];

    const connectors = [
      {
        id: '1',
        actionTypeId: '.jira',
        name: '1',
        config: {},
        isPreconfigured: false,
        isDeprecated: false,
        isSystemAction: false,
        referencedByCount: 1,
      },
      {
        id: '2',
        actionTypeId: '.servicenow',
        name: '2',
        config: {},
        isPreconfigured: false,
        isDeprecated: false,
        isSystemAction: false,

        referencedByCount: 1,
      },
      {
        id: '3',
        actionTypeId: '.unsupported',
        name: '3',
        config: {},
        isPreconfigured: false,
        isDeprecated: false,
        isSystemAction: false,
        referencedByCount: 1,
      },
    ];

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('remove unsupported connectors', async () => {
      actionsClient.listTypes.mockImplementation(async () => actionTypes);
      actionsClient.getAll.mockImplementation(async () => connectors);

      expect(await getConnectors(args)).toEqual([
        {
          id: '1',
          actionTypeId: '.jira',
          name: '1',
          config: {},
          isPreconfigured: false,
          isDeprecated: false,
          isSystemAction: false,
          referencedByCount: 1,
        },
        {
          id: '2',
          actionTypeId: '.servicenow',
          name: '2',
          config: {},
          isPreconfigured: false,
          isSystemAction: false,
          isDeprecated: false,
          referencedByCount: 1,
        },
      ]);
    });

    it('returns preconfigured connectors', async () => {
      actionsClient.listTypes.mockImplementation(async () => actionTypes);
      actionsClient.getAll.mockImplementation(async () => [
        ...connectors,
        {
          id: '4',
          actionTypeId: '.servicenow',
          name: 'sn-preconfigured',
          config: {},
          isPreconfigured: true,
          isDeprecated: false,
          isSystemAction: false,
          referencedByCount: 1,
        },
      ]);

      expect(await getConnectors(args)).toEqual([
        {
          id: '1',
          actionTypeId: '.jira',
          name: '1',
          config: {},
          isPreconfigured: false,
          isDeprecated: false,
          isSystemAction: false,
          referencedByCount: 1,
        },
        {
          id: '2',
          actionTypeId: '.servicenow',
          name: '2',
          config: {},
          isPreconfigured: false,
          isDeprecated: false,
          isSystemAction: false,
          referencedByCount: 1,
        },
        {
          id: '4',
          actionTypeId: '.servicenow',
          name: 'sn-preconfigured',
          config: {},
          isPreconfigured: true,
          isSystemAction: false,
          isDeprecated: false,
          referencedByCount: 1,
        },
      ]);
    });

    it('filter out connectors that are unsupported by the current license', async () => {
      actionsClient.listTypes.mockImplementation(async () => actionTypes);
      actionsClient.getAll.mockImplementation(async () => [
        ...connectors,
        {
          id: '4',
          actionTypeId: '.swimlane',
          name: 'swimlane',
          config: {},
          isPreconfigured: false,
          isDeprecated: false,
          isSystemAction: false,
          referencedByCount: 1,
        },
      ]);

      expect(await getConnectors(args)).toEqual([
        {
          id: '1',
          actionTypeId: '.jira',
          name: '1',
          config: {},
          isPreconfigured: false,
          isDeprecated: false,
          isSystemAction: false,
          referencedByCount: 1,
        },
        {
          id: '2',
          actionTypeId: '.servicenow',
          name: '2',
          config: {},
          isPreconfigured: false,
          isDeprecated: false,
          isSystemAction: false,
          referencedByCount: 1,
        },
      ]);
    });

    it('limits connectors returned to 1000', async () => {
      actionsClient.listTypes.mockImplementation(async () => actionTypes.slice(0, 1));
      actionsClient.getAll.mockImplementation(async () =>
        Array(MAX_SUPPORTED_CONNECTORS_RETURNED + 1).fill(connectors[0])
      );

      expect((await getConnectors(args)).length).toEqual(MAX_SUPPORTED_CONNECTORS_RETURNED);
    });
  });

  describe('get', () => {
    it('throws with excess fields', async () => {
      await expect(
        // @ts-expect-error: excess attribute
        get({ owner: 'cases', foo: 'bar' }, clientArgs, casesClientInternal)
      ).rejects.toThrow('invalid keys "foo"');
    });
  });

  describe('update', () => {
    it('throws with excess fields', async () => {
      await expect(
        // @ts-expect-error: excess attribute
        update('test-id', { version: 'test-version', foo: 'bar' }, clientArgs, casesClientInternal)
      ).rejects.toThrow('invalid keys "foo"');
    });

    it(`throws when trying to update more than ${MAX_CUSTOM_FIELDS_PER_CASE} custom fields`, async () => {
      await expect(
        update(
          'test-id',
          {
            version: 'test-version',
            customFields: new Array(MAX_CUSTOM_FIELDS_PER_CASE + 1).fill({
              key: 'foobar',
              label: 'text',
              type: CustomFieldTypes.TEXT,
              required: false,
            }),
          },
          clientArgs,
          casesClientInternal
        )
      ).rejects.toThrow(
        `Failed to get patch configure in route: Error: The length of the field customFields is too long. Array must be of length <= ${MAX_CUSTOM_FIELDS_PER_CASE}.`
      );
    });

    it('throws when there are duplicated custom field keys in the request', async () => {
      await expect(
        update(
          'test-id',
          {
            version: 'test-version',
            customFields: [
              {
                key: 'duplicated_key',
                label: 'text',
                type: CustomFieldTypes.TEXT,
                required: false,
              },
              {
                key: 'duplicated_key',
                label: 'text',
                type: CustomFieldTypes.TEXT,
                required: false,
              },
            ],
          },
          clientArgs,
          casesClientInternal
        )
      ).rejects.toThrow(
        'Failed to get patch configure in route: Error: Invalid duplicated customFields keys in request: duplicated_key'
      );
    });

    it('throws when trying to updated the type of a custom field', async () => {
      clientArgs.services.caseConfigureService.get.mockResolvedValue({
        // @ts-ignore: these are all the attributes needed for the test
        attributes: {
          customFields: [
            {
              key: 'wrong_type_key',
              label: 'text',
              type: CustomFieldTypes.TOGGLE,
              required: false,
            },
          ],
        },
      });

      await expect(
        update(
          'test-id',
          {
            version: 'test-version',
            customFields: [
              {
                key: 'wrong_type_key',
                label: 'text label',
                type: CustomFieldTypes.TEXT,
                required: false,
              },
            ],
          },
          clientArgs,
          casesClientInternal
        )
      ).rejects.toThrow(
        'Failed to get patch configure in route: Error: Invalid custom field types in request for the following labels: "text label"'
      );
    });

    describe('templates', () => {
      it(`does not throw error when trying to update templates`, async () => {
        clientArgs.services.caseConfigureService.get.mockResolvedValue({
          // @ts-ignore: these are all the attributes needed for the test
          attributes: {
            customFields: [],
            connector: {
              id: 'none',
              name: 'none',
              type: ConnectorTypes.none,
              fields: null,
            },
            closure_type: 'close-by-user',
            owner: 'cases',
            templates: [],
          },
          version: 'test-version',
        });

        clientArgs.services.caseConfigureService.patch.mockResolvedValue({
          id: 'test-id',
          type: 'cases-configure',
          version: 'test-version',
          namespaces: ['default'],
          references: [],
          attributes: {
            templates: [
              {
                key: 'template_1',
                name: 'template 1',
                description: 'test',
                tags: ['foo', 'bar'],
                caseFields: {
                  title: 'Case title',
                  description: 'This is test desc',
                  tags: ['sample-1'],
                  assignees: [],
                  customFields: [],
                  category: null,
                },
              },
            ],
            created_at: '2019-11-25T21:54:48.952Z',
            created_by: {
              full_name: 'elastic',
              email: 'testemail@elastic.co',
              username: 'elastic',
            },
            updated_at: '2019-11-25T21:54:48.952Z',
            updated_by: {
              full_name: 'elastic',
              email: 'testemail@elastic.co',
              username: 'elastic',
            },
          },
        });

        await expect(
          update(
            'test-id',
            {
              version: 'test-version',
              templates: [
                {
                  key: 'template_1',
                  name: 'template 1',
                  description: 'test',
                  tags: ['foo', 'bar'],
                  caseFields: {
                    title: 'Case title',
                    description: 'This is test desc',
                    tags: ['sample-1'],
                    assignees: [],
                    customFields: [],
                    category: null,
                  },
                },
              ],
            },
            clientArgs,
            casesClientInternal
          )
        ).resolves.not.toThrow();
      });

      it(`does not throw error when trying to update to empty templates`, async () => {
        clientArgs.services.caseConfigureService.get.mockResolvedValue({
          // @ts-ignore: these are all the attributes needed for the test
          attributes: {
            customFields: [],
            connector: {
              id: 'none',
              name: 'none',
              type: ConnectorTypes.none,
              fields: null,
            },
            closure_type: 'close-by-user',
            owner: 'cases',
            templates: [
              {
                key: 'template_1',
                name: 'template 1',
                description: 'test',
                tags: ['foo', 'bar'],
                caseFields: {
                  title: 'Case title',
                  description: 'This is test desc',
                  tags: ['sample-1'],
                  assignees: [],
                  customFields: [],
                  category: null,
                },
              },
            ],
          },
          version: 'test-version',
        });

        clientArgs.services.caseConfigureService.patch.mockResolvedValue({
          id: 'test-id',
          type: 'cases-configure',
          version: 'test-version',
          namespaces: ['default'],
          references: [],
          attributes: {
            templates: [],
            created_at: '2019-11-25T21:54:48.952Z',
            created_by: {
              full_name: 'elastic',
              email: 'testemail@elastic.co',
              username: 'elastic',
            },
            updated_at: '2019-11-25T21:54:48.952Z',
            updated_by: {
              full_name: 'elastic',
              email: 'testemail@elastic.co',
              username: 'elastic',
            },
          },
        });

        await expect(
          update(
            'test-id',
            {
              version: 'test-version',
              templates: [],
            },
            clientArgs,
            casesClientInternal
          )
        ).resolves.not.toThrow();
      });

      it(`throws when trying to update more than ${MAX_TEMPLATES_LENGTH} templates`, async () => {
        await expect(
          update(
            'test-id',
            {
              version: 'test-version',
              templates: new Array(MAX_TEMPLATES_LENGTH + 1).fill({
                key: 'template_1',
                name: 'template 1',
                caseFields: null,
              }),
            },
            clientArgs,
            casesClientInternal
          )
        ).rejects.toThrow(
          `Failed to get patch configure in route: Error: The length of the field templates is too long. Array must be of length <= ${MAX_TEMPLATES_LENGTH}.`
        );
      });

      it('throws when there are duplicated template keys in the request', async () => {
        await expect(
          update(
            'test-id',
            {
              version: 'test-version',
              templates: [
                {
                  key: 'template_1',
                  name: 'template 1',
                  description: 'test',
                  tags: ['foo', 'bar'],
                  caseFields: null,
                },
                {
                  key: 'template_1',
                  name: 'template 2',
                  tags: [],
                  caseFields: {
                    title: 'Case title',
                  },
                },
              ],
            },
            clientArgs,
            casesClientInternal
          )
        ).rejects.toThrow(
          'Failed to get patch configure in route: Error: Invalid duplicated templates keys in request: template_1'
        );
      });

      describe('customFields', () => {
        it('throws when there are no customFields in configure and template has customField in the request', async () => {
          clientArgs.services.caseConfigureService.get.mockResolvedValue({
            // @ts-ignore: these are all the attributes needed for the test
            attributes: {
              templates: [
                {
                  key: 'template_1',
                  name: 'template 1',
                  description: 'this is test description',
                  caseFields: null,
                },
              ],
            },
          });

          await expect(
            update(
              'test-id',
              {
                version: 'test-version',
                templates: [
                  {
                    key: 'template_1',
                    name: 'template 1',
                    description: 'this is test description',
                    caseFields: {
                      customFields: [
                        {
                          key: 'custom_field_key_1',
                          type: CustomFieldTypes.TEXT,
                          value: 'custom field value 1',
                        },
                      ],
                    },
                  },
                ],
              },
              clientArgs,
              casesClientInternal
            )
          ).rejects.toThrow(
            'Failed to get patch configure in route: Error: No custom fields configured.'
          );
        });

        it('throws when template has duplicated custom field keys in the request', async () => {
          clientArgs.services.caseConfigureService.get.mockResolvedValue({
            // @ts-ignore: these are all the attributes needed for the test
            attributes: {
              customFields: [
                {
                  key: 'custom_field_key_1',
                  label: 'text label',
                  type: CustomFieldTypes.TEXT,
                  required: false,
                },
              ],
              templates: [
                {
                  key: 'template_1',
                  name: 'template 1',
                  description: 'this is test description',
                  caseFields: {
                    customFields: [
                      {
                        key: 'custom_field_key_1',
                        type: CustomFieldTypes.TEXT,
                        value: 'custom field value 1',
                      },
                    ],
                  },
                },
              ],
            },
          });

          await expect(
            update(
              'test-id',
              {
                version: 'test-version',
                templates: [
                  {
                    key: 'template_1',
                    name: 'template 1',
                    description: 'test',
                    caseFields: {
                      customFields: [
                        {
                          key: 'custom_field_key_1',
                          type: CustomFieldTypes.TEXT,
                          value: 'custom field value 1',
                        },
                        {
                          key: 'custom_field_key_1',
                          type: CustomFieldTypes.TEXT,
                          value: 'custom field value 2',
                        },
                      ],
                    },
                  },
                ],
              },
              clientArgs,
              casesClientInternal
            )
          ).rejects.toThrow(
            `Failed to get patch configure in route: Error: Invalid duplicated templates[0]'s customFields keys in request: custom_field_key_1`
          );
        });

        it('throws when there are invalid customField keys in the request', async () => {
          clientArgs.services.caseConfigureService.get.mockResolvedValue({
            // @ts-ignore: these are all the attributes needed for the test
            attributes: {
              customFields: [
                {
                  key: 'custom_field_key_1',
                  label: 'text label',
                  type: CustomFieldTypes.TEXT,
                  required: false,
                },
              ],
              templates: [
                {
                  key: 'template_1',
                  name: 'template 1',
                  description: 'this is test description',
                  caseFields: {
                    customFields: [
                      {
                        key: 'custom_field_key_1',
                        type: CustomFieldTypes.TEXT,
                        value: 'custom field value 1',
                      },
                    ],
                  },
                },
              ],
            },
          });

          await expect(
            update(
              'test-id',
              {
                version: 'test-version',
                templates: [
                  {
                    key: 'template_1',
                    name: 'template 1',
                    description: 'this is test description',
                    caseFields: {
                      customFields: [
                        {
                          key: 'custom_field_key_2',
                          type: CustomFieldTypes.TEXT,
                          value: 'custom field value 1',
                        },
                      ],
                    },
                  },
                ],
              },
              clientArgs,
              casesClientInternal
            )
          ).rejects.toThrow(
            'Failed to get patch configure in route: Error: Invalid custom field keys: custom_field_key_2'
          );
        });

        it('throws when template has customField with invalid type in the request', async () => {
          clientArgs.services.caseConfigureService.get.mockResolvedValue({
            // @ts-ignore: these are all the attributes needed for the test
            attributes: {
              customFields: [
                {
                  key: 'custom_field_key_1',
                  label: 'text label',
                  type: CustomFieldTypes.TEXT,
                  required: false,
                },
              ],
              templates: [
                {
                  key: 'template_1',
                  name: 'template 1',
                  description: 'this is test description',
                  caseFields: {
                    customFields: [
                      {
                        key: 'custom_field_key_1',
                        type: CustomFieldTypes.TEXT,
                        value: 'custom field value 1',
                      },
                    ],
                  },
                },
              ],
            },
          });

          await expect(
            update(
              'test-id',
              {
                version: 'test-version',
                templates: [
                  {
                    key: 'template_1',
                    name: 'template 1',
                    description: 'this is test description',
                    caseFields: {
                      customFields: [
                        {
                          key: 'custom_field_key_1',
                          type: CustomFieldTypes.TOGGLE,
                          value: true,
                        },
                      ],
                    },
                  },
                ],
              },
              clientArgs,
              casesClientInternal
            )
          ).rejects.toThrow(
            'Failed to get patch configure in route: Error: The following custom fields have the wrong type in the request: "text label"'
          );
        });

        it('removes deleted custom field from template correctly', async () => {
          clientArgs.services.caseConfigureService.get.mockResolvedValue({
            // @ts-ignore: these are all the attributes needed for the test
            attributes: {
              connector: {
                id: 'none',
                name: 'none',
                type: ConnectorTypes.none,
                fields: null,
              },
              customFields: [
                {
                  key: 'custom_field_key_1',
                  label: 'text label',
                  type: CustomFieldTypes.TEXT,
                  required: false,
                },
              ],
              templates: [
                {
                  key: 'template_1',
                  name: 'template 1',
                  description: 'this is test description',
                  caseFields: {
                    customFields: [
                      {
                        key: 'custom_field_key_1',
                        type: CustomFieldTypes.TEXT,
                        value: 'custom field value 1',
                      },
                    ],
                  },
                },
              ],
              closure_type: 'close-by-user',
              owner: 'cases',
            },
            id: 'test-id',
            version: 'test-version',
          });

          await update(
            'test-id',
            {
              version: 'test-version',
              customFields: [],
              templates: [
                {
                  key: 'template_1',
                  name: 'template 1',
                  description: 'this is test description',
                  caseFields: {
                    customFields: [
                      {
                        key: 'custom_field_key_1',
                        type: CustomFieldTypes.TEXT,
                        value: 'updated value',
                      },
                    ],
                  },
                },
              ],
            },
            clientArgs,
            casesClientInternal
          );

          expect(clientArgs.services.caseConfigureService.patch).toHaveBeenCalledWith({
            configurationId: 'test-id',
            originalConfiguration: {
              attributes: {
                closure_type: 'close-by-user',
                connector: {
                  fields: null,
                  id: 'none',
                  name: 'none',
                  type: '.none',
                },
                customFields: [
                  {
                    key: 'custom_field_key_1',
                    label: 'text label',
                    required: false,
                    type: 'text',
                  },
                ],
                owner: 'cases',
                templates: [
                  {
                    caseFields: {
                      customFields: [
                        {
                          key: 'custom_field_key_1',
                          type: 'text',
                          value: 'custom field value 1',
                        },
                      ],
                    },
                    description: 'this is test description',
                    key: 'template_1',
                    name: 'template 1',
                  },
                ],
              },
              id: 'test-id',
              version: 'test-version',
            },
            unsecuredSavedObjectsClient: expect.anything(),
            updatedAttributes: {
              customFields: [],
              templates: [
                {
                  caseFields: {
                    customFields: [],
                  },
                  description: 'this is test description',
                  key: 'template_1',
                  name: 'template 1',
                },
              ],
              updated_at: expect.anything(),
              updated_by: expect.anything(),
            },
          });
        });
      });

      describe('assignees', () => {
        it('throws if the user does not have the correct license while adding assignees in template ', async () => {
          clientArgs.services.licensingService.isAtLeastPlatinum.mockResolvedValue(false);
          clientArgs.services.caseConfigureService.get.mockResolvedValue({
            // @ts-ignore: these are all the attributes needed for the test
            attributes: {
              templates: [
                {
                  key: 'template_1',
                  name: 'template 1',
                  description: 'this is test description',
                  tags: ['foo', 'bar'],
                  caseFields: null,
                },
              ],
            },
          });

          await expect(
            update(
              'test-id',
              {
                version: 'test-version',
                templates: [
                  {
                    key: 'template_1',
                    name: 'template 1',
                    description: 'this is test description',
                    tags: ['foo', 'bar'],
                    caseFields: {
                      assignees: [{ uid: '1' }],
                    },
                  },
                ],
              },
              clientArgs,
              casesClientInternal
            )
          ).rejects.toThrow(
            'Failed to get patch configure in route: Error: In order to assign users to cases, you must be subscribed to an Elastic Platinum license'
          );
        });
      });
    });
  });

  describe('create', () => {
    const baseRequest = {
      connector: {
        id: 'none',
        name: 'none',
        type: ConnectorTypes.none,
        fields: null,
      },
      closure_type: 'close-by-user',
      owner: 'securitySolutionFixture',
    } as ConfigurationRequest;

    it(`throws when trying to create more than ${MAX_CUSTOM_FIELDS_PER_CASE} custom fields`, async () => {
      await expect(
        create(
          {
            ...baseRequest,
            customFields: new Array(MAX_CUSTOM_FIELDS_PER_CASE + 1).fill({
              key: 'foobar',
              label: 'text',
              type: CustomFieldTypes.TEXT,
              required: false,
            }),
          },
          clientArgs,
          casesClientInternal
        )
      ).rejects.toThrow(
        `Failed to create case configuration: Error: The length of the field customFields is too long. Array must be of length <= ${MAX_CUSTOM_FIELDS_PER_CASE}.`
      );
    });

    it('throws when there are duplicated keys in the request', async () => {
      await expect(
        create(
          {
            ...baseRequest,
            customFields: [
              {
                key: 'duplicated_key',
                label: 'text',
                type: CustomFieldTypes.TEXT,
                required: false,
              },
              {
                key: 'duplicated_key',
                label: 'text',
                type: CustomFieldTypes.TEXT,
                required: false,
              },
            ],
          },
          clientArgs,
          casesClientInternal
        )
      ).rejects.toThrow(
        'Failed to create case configuration: Error: Invalid duplicated customFields keys in request: duplicated_key'
      );
    });

    describe('templates', () => {
      it(`throws when trying to create more than ${MAX_TEMPLATES_LENGTH} templates`, async () => {
        await expect(
          create(
            {
              ...baseRequest,
              templates: new Array(MAX_TEMPLATES_LENGTH + 1).fill({
                key: 'template_1',
                name: 'template 1',
                description: 'test',
                caseFields: null,
              }),
            },
            clientArgs,
            casesClientInternal
          )
        ).rejects.toThrow(
          `Failed to create case configuration: Error: The length of the field templates is too long. Array must be of length <= ${MAX_TEMPLATES_LENGTH}.`
        );
      });

      it('throws when there are duplicated template keys in the request', async () => {
        await expect(
          create(
            {
              ...baseRequest,
              templates: [
                {
                  key: 'duplicated_key',
                  name: 'template 1',
                  description: 'test',
                  caseFields: null,
                },
                {
                  key: 'duplicated_key',
                  name: 'template 2',
                  description: 'test',
                  tags: [],
                  caseFields: {
                    title: 'Case title',
                  },
                },
              ],
            },
            clientArgs,
            casesClientInternal
          )
        ).rejects.toThrow(
          'Failed to create case configuration: Error: Invalid duplicated templates keys in request: duplicated_key'
        );
      });

      describe('customFields', () => {
        it('does not throw error when creating template with correct custom fields', async () => {
          const customFields = [
            {
              key: 'custom_field_key_1',
              type: CustomFieldTypes.TEXT,
              label: 'custom field 1',
              required: true,
            },
          ];
          const templates: TemplatesConfiguration = [
            {
              key: 'template_1',
              name: 'template 1',
              description: 'test',
              tags: ['foo', 'bar'],
              caseFields: {
                customFields: [
                  {
                    key: 'custom_field_key_1',
                    type: CustomFieldTypes.TEXT,
                    value: 'custom field value 1',
                  },
                ],
              },
            },
          ];

          clientArgs.services.caseConfigureService.find.mockResolvedValueOnce({
            page: 1,
            per_page: 20,
            total: 1,
            saved_objects: [
              {
                id: 'test-id',
                type: 'cases-configure',
                version: 'test-version',
                namespaces: ['default'],
                references: [],
                attributes: {
                  ...baseRequest,
                  customFields,
                  templates,
                  created_at: '2019-11-25T21:54:48.952Z',
                  created_by: {
                    full_name: 'elastic',
                    email: 'testemail@elastic.co',
                    username: 'elastic',
                  },
                  updated_at: null,
                  updated_by: null,
                },
                score: 0,
              },
            ],
            pit_id: undefined,
          });

          clientArgs.services.caseConfigureService.post.mockResolvedValue({
            id: 'test-id',
            type: 'cases-configure',
            version: 'test-version',
            namespaces: ['default'],
            references: [],
            attributes: {
              ...baseRequest,
              customFields,
              templates,
              created_at: '2019-11-25T21:54:48.952Z',
              created_by: {
                full_name: 'elastic',
                email: 'testemail@elastic.co',
                username: 'elastic',
              },
              updated_at: null,
              updated_by: null,
            },
          });

          await expect(
            create(
              {
                ...baseRequest,
                customFields,
                templates,
              },
              clientArgs,
              casesClientInternal
            )
          ).resolves.not.toThrow();
        });

        it('throws when there are no customFields in configure and template has customField in the request', async () => {
          await expect(
            create(
              {
                ...baseRequest,
                templates: [
                  {
                    key: 'template_1',
                    name: 'template 1',
                    description: 'this is test description',
                    tags: ['foo', 'bar'],
                    caseFields: {
                      customFields: [
                        {
                          key: 'custom_field_key_1',
                          type: CustomFieldTypes.TEXT,
                          value: 'custom field value 1',
                        },
                      ],
                    },
                  },
                ],
              },
              clientArgs,
              casesClientInternal
            )
          ).rejects.toThrow(
            'Failed to create case configuration: Error: No custom fields configured.'
          );
        });

        it('throws when template has duplicated custom field keys in the request', async () => {
          await expect(
            create(
              {
                ...baseRequest,
                customFields: [
                  {
                    key: 'custom_field_key_1',
                    type: CustomFieldTypes.TEXT,
                    label: 'custom field 1',
                    required: true,
                  },
                ],
                templates: [
                  {
                    key: 'template_1',
                    name: 'template 1',
                    description: 'test',
                    tags: ['foo', 'bar'],
                    caseFields: {
                      customFields: [
                        {
                          key: 'custom_field_key_1',
                          type: CustomFieldTypes.TEXT,
                          value: 'custom field value 1',
                        },
                        {
                          key: 'custom_field_key_1',
                          type: CustomFieldTypes.TEXT,
                          value: 'custom field value 2',
                        },
                      ],
                    },
                  },
                ],
              },
              clientArgs,
              casesClientInternal
            )
          ).rejects.toThrow(
            `Failed to create case configuration: Error: Invalid duplicated templates[0]'s customFields keys in request: custom_field_key_1`
          );
        });

        it('throws when there are invalid customField keys in the request', async () => {
          await expect(
            create(
              {
                ...baseRequest,
                customFields: [
                  {
                    key: 'custom_field_key_1',
                    type: CustomFieldTypes.TEXT,
                    label: 'custom field 1',
                    required: true,
                  },
                ],
                templates: [
                  {
                    key: 'template_1',
                    name: 'template 1',
                    description: 'this is test description',
                    caseFields: {
                      customFields: [
                        {
                          key: 'custom_field_key_2',
                          type: CustomFieldTypes.TEXT,
                          value: 'custom field value 1',
                        },
                      ],
                    },
                  },
                ],
              },
              clientArgs,
              casesClientInternal
            )
          ).rejects.toThrow(
            'Failed to create case configuration: Error: Invalid custom field keys: custom_field_key_2'
          );
        });

        it('throws when template has customField with invalid type in the request', async () => {
          await expect(
            create(
              {
                ...baseRequest,
                customFields: [
                  {
                    key: 'custom_field_key_1',
                    type: CustomFieldTypes.TEXT,
                    label: 'custom field 1',
                    required: true,
                  },
                ],
                templates: [
                  {
                    key: 'template_1',
                    name: 'template 1',
                    description: 'this is test description',
                    caseFields: {
                      customFields: [
                        {
                          key: 'custom_field_key_1',
                          type: CustomFieldTypes.TOGGLE,
                          value: true,
                        },
                      ],
                    },
                  },
                ],
              },
              clientArgs,
              casesClientInternal
            )
          ).rejects.toThrow(
            'Failed to create case configuration: Error: The following custom fields have the wrong type in the request: "custom field 1"'
          );
        });
      });

      describe('assignees', () => {
        it('throws if the user does not have the correct license while adding assignees in template ', async () => {
          clientArgs.services.licensingService.isAtLeastPlatinum.mockResolvedValue(false);

          await expect(
            create(
              {
                ...baseRequest,
                templates: [
                  {
                    key: 'template_1',
                    name: 'template 1',
                    description: 'this is test description',
                    tags: [],
                    caseFields: {
                      assignees: [{ uid: '1' }],
                    },
                  },
                ],
              },
              clientArgs,
              casesClientInternal
            )
          ).rejects.toThrow(
            'Failed to create case configuration: Error: In order to assign users to cases, you must be subscribed to an Elastic Platinum license'
          );
        });
      });
    });
  });
});
