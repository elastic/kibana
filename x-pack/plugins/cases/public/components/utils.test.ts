/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionTypeRegistryMock } from '@kbn/triggers-actions-ui-plugin/public/application/action_type_registry.mock';
import { triggersActionsUiMock } from '@kbn/triggers-actions-ui-plugin/public/mocks';
import { elasticUser, getCaseUsersMockResponse } from '../containers/mock';
import {
  connectorDeprecationValidator,
  convertEmptyValuesToNull,
  getConnectorIcon,
  getConnectorsFormDeserializer,
  getConnectorsFormSerializer,
  isDeprecatedConnector,
  isEmptyValue,
  removeItemFromSessionStorage,
  parseURL,
  stringifyToURL,
  parseCaseUsers,
  convertCustomFieldValue,
} from './utils';

describe('Utils', () => {
  const connector = {
    id: 'test',
    actionTypeId: '.webhook',
    name: 'Test',
    config: { usesTableApi: false },
    secrets: {},
    isPreconfigured: false,
    isSystemAction: false,
    isDeprecated: false,
  };

  describe('getConnectorIcon', () => {
    const { createMockActionTypeModel } = actionTypeRegistryMock;
    const mockTriggersActionsUiService = triggersActionsUiMock.createStart();
    mockTriggersActionsUiService.actionTypeRegistry.register(
      createMockActionTypeModel({ id: '.test', iconClass: 'test' })
    );

    it('it returns the correct icon class', () => {
      expect(getConnectorIcon(mockTriggersActionsUiService, '.test')).toBe('test');
    });

    it('it returns an empty string if the type is undefined', () => {
      expect(getConnectorIcon(mockTriggersActionsUiService)).toBe('');
    });

    it('it returns an empty string if the type is not registered', () => {
      expect(getConnectorIcon(mockTriggersActionsUiService, '.not-registered')).toBe('');
    });

    it('it returns an empty string if it throws', () => {
      mockTriggersActionsUiService.actionTypeRegistry.get = () => {
        throw new Error();
      };

      expect(getConnectorIcon(mockTriggersActionsUiService, '.not-registered')).toBe('');
    });
  });

  describe('connectorDeprecationValidator', () => {
    it('returns undefined if the connector is not deprecated', () => {
      expect(connectorDeprecationValidator(connector)).toBe(undefined);
    });

    it('returns a deprecation message if the connector is deprecated', () => {
      expect(connectorDeprecationValidator({ ...connector, isDeprecated: true })).toEqual({
        message: 'Deprecated connector',
      });
    });
  });

  describe('isDeprecatedConnector', () => {
    it('returns false if the connector is not defined', () => {
      expect(isDeprecatedConnector()).toBe(false);
    });

    it('returns false if the connector is marked as deprecated', () => {
      expect(isDeprecatedConnector({ ...connector, isDeprecated: false })).toBe(false);
    });

    it('returns true if the connector is marked as deprecated', () => {
      expect(isDeprecatedConnector({ ...connector, isDeprecated: true })).toBe(true);
    });

    it('returns true if the connector is marked as deprecated (preconfigured connector)', () => {
      expect(
        isDeprecatedConnector({ ...connector, isDeprecated: true, isPreconfigured: true })
      ).toBe(true);
    });

    it('returns false if the connector is not marked as deprecated (preconfigured connector)', () => {
      expect(
        isDeprecatedConnector({ ...connector, isDeprecated: false, isPreconfigured: true })
      ).toBe(false);
    });
  });

  describe('removeItemFromSessionStorage', () => {
    const sessionKey = 'testKey';
    const sessionValue = 'test value';

    afterEach(() => {
      sessionStorage.removeItem(sessionKey);
    });

    it('successfully removes key from session storage', () => {
      sessionStorage.setItem(sessionKey, sessionValue);

      expect(sessionStorage.getItem(sessionKey)).toBe(sessionValue);

      removeItemFromSessionStorage(sessionKey);

      expect(sessionStorage.getItem(sessionKey)).toBe(null);
    });

    it('is null if key is not in session storage', () => {
      removeItemFromSessionStorage(sessionKey);

      expect(sessionStorage.getItem(sessionKey)).toBe(null);
    });
  });

  describe('getConnectorsFormSerializer', () => {
    it('converts empty values to null', () => {
      const res = getConnectorsFormSerializer({
        // @ts-expect-error: expects real connector fields.
        fields: { foo: null, bar: undefined, baz: [], qux: '', quux: {} },
      });

      expect(res).toEqual({ fields: { foo: null, bar: null, baz: null, qux: null, quux: null } });
    });

    it('does not converts non-empty values to null', () => {
      const fields = {
        foo: 1,
        bar: 'test',
        baz: true,
        qux: false,
        quux: { test: 'test', foo: null, bar: undefined },
        test: [null, 'test', 1, true, false, {}, '', undefined],
      };

      const res = getConnectorsFormSerializer({
        // @ts-expect-error: expects real connector fields.
        fields,
      });

      expect(res).toEqual({ fields });
    });
  });

  describe('getConnectorsFormDeserializer', () => {
    it('converts null values to undefined', () => {
      const res = getConnectorsFormDeserializer({
        // @ts-expect-error: expects real connector fields.
        fields: { foo: null, bar: undefined, baz: [], qux: '', quux: {} },
      });

      expect(res).toEqual({
        fields: { foo: undefined, bar: undefined, baz: [], qux: '', quux: {} },
      });
    });
  });

  describe('convertEmptyValuesToNull', () => {
    it('converts empty values to null', () => {
      const res = convertEmptyValuesToNull({
        foo: null,
        bar: undefined,
        baz: [],
        qux: '',
        quux: {},
      });

      expect(res).toEqual({ foo: null, bar: null, baz: null, qux: null, quux: null });
    });

    it('does not converts non-empty values to null', () => {
      const fields = {
        foo: 1,
        bar: 'test',
        baz: true,
        qux: false,
        quux: { test: 'test', foo: null, bar: undefined },
        test: [null, 'test', 1, true, false, {}, '', undefined],
      };

      const res = convertEmptyValuesToNull(fields);

      expect(res).toEqual(fields);
    });

    it.each([null, undefined])('returns null if the value is %s', (value) => {
      const res = convertEmptyValuesToNull(value);
      expect(res).toEqual(null);
    });
  });

  describe('isEmptyValue', () => {
    it.each([null, undefined, [], '', {}])('returns true for value: %s', (value) => {
      expect(isEmptyValue(value)).toBe(true);
    });

    it.each([
      1,
      'test',
      true,
      false,
      { test: 'test', foo: null, bar: undefined },
      [null, 'test', 1, true, false, {}, '', undefined],
    ])('returns false for value: %s', (value) => {
      expect(isEmptyValue(value)).toBe(false);
    });
  });

  describe('parseUrl', () => {
    it('parses URL correctly into object', () => {
      expect(
        parseURL(
          'severity=critical&status=open&page=1&perPage=10&sortField=createdAt&sortOrder=desc'
        )
      ).toEqual({
        page: '1',
        severity: 'critical',
        perPage: '10',
        sortField: 'createdAt',
        sortOrder: 'desc',
        status: 'open',
      });
    });

    it('parses empty URL correctly into object', () => {
      expect(parseURL('')).toEqual({});
    });
  });

  describe('stringifyToURL', () => {
    it('stringifies object correctly into URL', () => {
      expect(
        stringifyToURL({
          page: '1',
          severity: 'critical',
          perPage: '10',
          sortField: 'createdAt',
          sortOrder: 'desc',
          status: 'open',
        })
      ).toBe('page=1&severity=critical&perPage=10&sortField=createdAt&sortOrder=desc&status=open');
    });

    it('stringifies empty object correctly into URL', () => {
      expect(stringifyToURL({})).toBe('');
    });
  });

  describe('parseCaseUsers', () => {
    it('should define userProfiles and reporters correctly', () => {
      const caseUsers = getCaseUsersMockResponse();
      const { userProfiles, reporterAsArray } = parseCaseUsers({
        caseUsers,
        createdBy: elasticUser,
      });

      expect(userProfiles).toMatchInlineSnapshot(`
        Map {
          "u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0" => Object {
            "data": Object {
              "avatar": undefined,
            },
            "uid": "u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0",
            "user": Object {
              "email": null,
              "full_name": null,
              "username": "elastic",
            },
          },
          "u_3OgKOf-ogtr8kJ5B0fnRcqzXs2aQQkZLtzKEEFnKaYg_0" => Object {
            "data": Object {
              "avatar": undefined,
            },
            "uid": "u_3OgKOf-ogtr8kJ5B0fnRcqzXs2aQQkZLtzKEEFnKaYg_0",
            "user": Object {
              "email": "fuzzy_marten@profiles.elastic.co",
              "full_name": "Fuzzy Marten",
              "username": "fuzzy_marten",
            },
          },
          "u_BXf_iGxcnicv4l-3-ER7I-XPpfanAFAap7uls86xV7A_0" => Object {
            "data": Object {
              "avatar": undefined,
            },
            "uid": "u_BXf_iGxcnicv4l-3-ER7I-XPpfanAFAap7uls86xV7A_0",
            "user": Object {
              "email": "misty_mackerel@profiles.elastic.co",
              "full_name": "Misty Mackerel",
              "username": "misty_mackerel",
            },
          },
          "participant_4_uid" => Object {
            "data": Object {
              "avatar": Object {
                "initials": "P4",
              },
            },
            "uid": "participant_4_uid",
            "user": Object {
              "email": null,
              "full_name": null,
              "username": "participant_4",
            },
          },
          "participant_5_uid" => Object {
            "data": Object {
              "avatar": undefined,
            },
            "uid": "participant_5_uid",
            "user": Object {
              "email": "participant_5@elastic.co",
              "full_name": "Participant 5",
              "username": "participant_5",
            },
          },
          "reporter_1_uid" => Object {
            "data": Object {
              "avatar": Object {
                "initials": "R1",
              },
            },
            "uid": "reporter_1_uid",
            "user": Object {
              "email": "reporter_1@elastic.co",
              "full_name": "Reporter 1",
              "username": "reporter_1",
            },
          },
          "u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0" => Object {
            "data": Object {
              "avatar": undefined,
            },
            "uid": "u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0",
            "user": Object {
              "email": "",
              "full_name": "",
              "username": "cases_no_connectors",
            },
          },
          "u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0" => Object {
            "data": Object {
              "avatar": undefined,
            },
            "uid": "u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0",
            "user": Object {
              "email": "valid_chimpanzee@profiles.elastic.co",
              "full_name": "Valid Chimpanzee",
              "username": "valid_chimpanzee",
            },
          },
        }
      `);
      expect(reporterAsArray).toEqual([
        {
          uid: 'reporter_1_uid',
          avatar: {
            initials: 'R1',
          },
          user: {
            email: 'reporter_1@elastic.co',
            full_name: 'Reporter 1',
            username: 'reporter_1',
          },
        },
      ]);
    });

    it('should define a reporter without uid correctly', () => {
      const caseUsers = getCaseUsersMockResponse();
      const { userProfiles, reporterAsArray } = parseCaseUsers({
        caseUsers: {
          ...caseUsers,
          reporter: {
            user: {
              email: 'reporter_no_uid@elastic.co',
              full_name: 'Reporter No UID',
              username: 'reporter_no_uid',
            },
          },
        },
        createdBy: elasticUser,
      });

      expect(userProfiles).toMatchInlineSnapshot(`
        Map {
          "u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0" => Object {
            "data": Object {
              "avatar": undefined,
            },
            "uid": "u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0",
            "user": Object {
              "email": null,
              "full_name": null,
              "username": "elastic",
            },
          },
          "u_3OgKOf-ogtr8kJ5B0fnRcqzXs2aQQkZLtzKEEFnKaYg_0" => Object {
            "data": Object {
              "avatar": undefined,
            },
            "uid": "u_3OgKOf-ogtr8kJ5B0fnRcqzXs2aQQkZLtzKEEFnKaYg_0",
            "user": Object {
              "email": "fuzzy_marten@profiles.elastic.co",
              "full_name": "Fuzzy Marten",
              "username": "fuzzy_marten",
            },
          },
          "u_BXf_iGxcnicv4l-3-ER7I-XPpfanAFAap7uls86xV7A_0" => Object {
            "data": Object {
              "avatar": undefined,
            },
            "uid": "u_BXf_iGxcnicv4l-3-ER7I-XPpfanAFAap7uls86xV7A_0",
            "user": Object {
              "email": "misty_mackerel@profiles.elastic.co",
              "full_name": "Misty Mackerel",
              "username": "misty_mackerel",
            },
          },
          "participant_4_uid" => Object {
            "data": Object {
              "avatar": Object {
                "initials": "P4",
              },
            },
            "uid": "participant_4_uid",
            "user": Object {
              "email": null,
              "full_name": null,
              "username": "participant_4",
            },
          },
          "participant_5_uid" => Object {
            "data": Object {
              "avatar": undefined,
            },
            "uid": "participant_5_uid",
            "user": Object {
              "email": "participant_5@elastic.co",
              "full_name": "Participant 5",
              "username": "participant_5",
            },
          },
          "u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0" => Object {
            "data": Object {
              "avatar": undefined,
            },
            "uid": "u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0",
            "user": Object {
              "email": "",
              "full_name": "",
              "username": "cases_no_connectors",
            },
          },
          "u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0" => Object {
            "data": Object {
              "avatar": undefined,
            },
            "uid": "u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0",
            "user": Object {
              "email": "valid_chimpanzee@profiles.elastic.co",
              "full_name": "Valid Chimpanzee",
              "username": "valid_chimpanzee",
            },
          },
        }
      `);
      expect(reporterAsArray).toEqual([
        {
          user: {
            email: 'reporter_no_uid@elastic.co',
            full_name: 'Reporter No UID',
            username: 'reporter_no_uid',
          },
        },
      ]);
    });

    it('uses the fallback reporter correctly', () => {
      const { userProfiles, reporterAsArray } = parseCaseUsers({
        createdBy: elasticUser,
      });

      expect(userProfiles).toMatchInlineSnapshot(`Map {}`);
      expect(reporterAsArray).toEqual([
        {
          uid: undefined,
          user: {
            email: 'leslie.knope@elastic.co',
            full_name: 'Leslie Knope',
            username: 'lknope',
          },
        },
      ]);
    });
  });

  describe('convertCustomFieldValue ', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns the string when the value is a non-empty string', async () => {
      expect(convertCustomFieldValue('my text value')).toMatchInlineSnapshot(`"my text value"`);
    });

    it('returns null when value is empty string', async () => {
      expect(convertCustomFieldValue('')).toMatchInlineSnapshot('null');
    });

    it('returns value as it is when value is true', async () => {
      expect(convertCustomFieldValue(true)).toMatchInlineSnapshot('true');
    });

    it('returns value as it is when value is false', async () => {
      expect(convertCustomFieldValue(false)).toMatchInlineSnapshot('false');
    });
  });
});
