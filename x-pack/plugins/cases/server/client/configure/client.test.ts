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
      it(`throws when trying to update more than ${MAX_TEMPLATES_LENGTH} templates`, async () => {
        await expect(
          update(
            'test-id',
            {
              version: 'test-version',
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
                  caseFields: null,
                },
                {
                  key: 'template_1',
                  name: 'template 2',
                  description: 'test',
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

      it('throws when there are invalid template keys in the request', async () => {
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
                  key: 'template_2',
                  name: 'template 2',
                  description: 'this is test description',
                  caseFields: null,
                },
              ],
            },
            clientArgs,
            casesClientInternal
          )
        ).rejects.toThrow(
          'Failed to get patch configure in route: Error: Invalid template keys: template_2'
        );
      });

      describe('customFields', () => {
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
      });

      describe('assignees', () => {
        it('should throw if the user does not have the correct license while adding assignees in template ', async () => {
          clientArgs.services.licensingService.isAtLeastPlatinum.mockResolvedValue(false);
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
            'Failed to create case configuration: Error: Cannot create template with custom fields as there are no custom fields in configuration'
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
        it('should throw if the user does not have the correct license while adding assignees in template ', async () => {
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
