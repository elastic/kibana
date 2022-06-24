/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GetTrustedAppsRequestSchema,
  GetTrustedAppsSummaryRequestSchema,
  PostTrustedAppCreateRequestSchema,
  PutTrustedAppUpdateRequestSchema,
} from './trusted_apps';
import { ConditionEntryField, OperatingSystem } from '@kbn/securitysolution-utils';
import { TrustedAppConditionEntry, NewTrustedApp, PutTrustedAppsRequestParams } from '../types';

describe('When invoking Trusted Apps Schema', () => {
  describe('for GET List', () => {
    const getListQueryParams = (page: unknown = 1, perPage: unknown = 20) => ({
      page,
      per_page: perPage,
    });
    const query = GetTrustedAppsRequestSchema.query;

    describe('query param validation', () => {
      it('should return query params if valid', () => {
        expect(query.validate(getListQueryParams())).toEqual({
          page: 1,
          per_page: 20,
        });
      });

      it('should use default values', () => {
        expect(query.validate(getListQueryParams(undefined, undefined))).toEqual({
          page: 1,
          per_page: 20,
        });
        expect(query.validate(getListQueryParams(undefined, 100))).toEqual({
          page: 1,
          per_page: 100,
        });
        expect(query.validate(getListQueryParams(10, undefined))).toEqual({
          page: 10,
          per_page: 20,
        });
      });

      it('should throw if `page` param is not a number', () => {
        expect(() => {
          query.validate(getListQueryParams('one'));
        }).toThrowError();
      });

      it('should throw if `page` param is less than 1', () => {
        expect(() => {
          query.validate(getListQueryParams(0));
        }).toThrowError();
        expect(() => {
          query.validate(getListQueryParams(-1));
        }).toThrowError();
      });

      it('should throw if `per_page` param is not a number', () => {
        expect(() => {
          query.validate(getListQueryParams(1, 'twenty'));
        }).toThrowError();
      });

      it('should throw if `per_page` param is less than 1', () => {
        expect(() => {
          query.validate(getListQueryParams(1, 0));
        }).toThrowError();
        expect(() => {
          query.validate(getListQueryParams(1, -1));
        }).toThrowError();
      });
    });
  });

  describe('for GET Summary', () => {
    const getListQueryParams = (kuery?: string) => ({ kuery });
    const query = GetTrustedAppsSummaryRequestSchema.query;

    describe('query param validation', () => {
      it('should return query params if valid without kuery', () => {
        expect(query.validate(getListQueryParams())).toEqual({});
      });

      it('should return query params if valid with kuery', () => {
        const kuery = `exception-list-agnostic.attributes.tags:"policy:caf1a334-53f3-4be9-814d-a32245f43d34" OR exception-list-agnostic.attributes.tags:"policy:all"`;
        expect(query.validate(getListQueryParams(kuery))).toEqual({ kuery });
      });
    });
  });

  describe('for POST Create', () => {
    const createConditionEntry = <T>(data?: T): TrustedAppConditionEntry => ({
      field: ConditionEntryField.PATH,
      type: 'match',
      operator: 'included',
      value: 'c:/programs files/Anti-Virus',
      ...(data || {}),
    });
    const createNewTrustedApp = <T>(data?: T): NewTrustedApp => ({
      name: 'Some Anti-Virus App',
      description: 'this one is ok',
      os: OperatingSystem.WINDOWS,
      effectScope: { type: 'global' },
      entries: [createConditionEntry()],
      ...(data || {}),
    });
    const body = PostTrustedAppCreateRequestSchema.body;

    it('should not error on a valid message', () => {
      const bodyMsg = createNewTrustedApp();
      expect(body.validate(bodyMsg)).toStrictEqual(bodyMsg);
    });

    it('should validate `name` is required', () => {
      expect(() => body.validate(createNewTrustedApp({ name: undefined }))).toThrow();
    });

    it('should validate `name` value to be non-empty', () => {
      expect(() => body.validate(createNewTrustedApp({ name: '' }))).toThrow();
    });

    it('should validate `description` as optional', () => {
      const { description, ...bodyMsg } = createNewTrustedApp();
      expect(body.validate(bodyMsg)).toStrictEqual(bodyMsg);
    });

    it('should validate `os` to only accept known values', () => {
      const bodyMsg = createNewTrustedApp({ os: undefined });
      expect(() => body.validate(bodyMsg)).toThrow();

      expect(() => body.validate({ ...bodyMsg, os: '' })).toThrow();

      expect(() => body.validate({ ...bodyMsg, os: 'winz' })).toThrow();

      [OperatingSystem.LINUX, OperatingSystem.MAC, OperatingSystem.WINDOWS].forEach((os) => {
        expect(() => body.validate({ ...bodyMsg, os })).not.toThrow();
      });
    });

    it('should validate `entries` as required', () => {
      expect(() => body.validate(createNewTrustedApp({ entries: undefined }))).toThrow();

      const { entries, ...bodyMsg2 } = createNewTrustedApp();
      expect(() => body.validate(bodyMsg2)).toThrow();
    });

    it('should validate `entries` to have at least 1 item', () => {
      expect(() => body.validate(createNewTrustedApp({ entries: [] }))).toThrow();
    });

    describe('when `entries` are defined', () => {
      // Some static hashes for use in validation. Some chr. are in UPPERcase on purpose
      const VALID_HASH_MD5 = '741462ab431a22233C787BAAB9B653C7';
      const VALID_HASH_SHA1 = 'aedb279e378BED6C2DB3C9DC9e12ba635e0b391c';
      const VALID_HASH_SHA256 = 'A4370C0CF81686C0B696FA6261c9d3e0d810ae704ab8301839dffd5d5112f476';

      it('should validate `entry.field` is required', () => {
        const { field, ...entry } = createConditionEntry();
        expect(() => body.validate(createNewTrustedApp({ entries: [entry] }))).toThrow();
      });

      it('should validate `entry.field` does not accept empty values', () => {
        const bodyMsg = createNewTrustedApp({
          entries: [createConditionEntry({ field: '' })],
        });
        expect(() => body.validate(bodyMsg)).toThrow();
      });

      it('should validate `entry.field` does not accept unknown values', () => {
        const bodyMsg = createNewTrustedApp({
          entries: [createConditionEntry({ field: 'invalid value' })],
        });
        expect(() => body.validate(bodyMsg)).toThrow();
      });

      it('should validate `entry.field` accepts hash field name for all os values', () => {
        [OperatingSystem.LINUX, OperatingSystem.MAC, OperatingSystem.WINDOWS].forEach((os) => {
          const bodyMsg3 = createNewTrustedApp({
            os,
            entries: [
              createConditionEntry({
                field: ConditionEntryField.HASH,
                value: 'A4370C0CF81686C0B696FA6261c9d3e0d810ae704ab8301839dffd5d5112f476',
              }),
            ],
          });

          expect(() => body.validate(bodyMsg3)).not.toThrow();
        });
      });

      it('should validate `entry.field` accepts path field name for all os values', () => {
        [OperatingSystem.LINUX, OperatingSystem.MAC, OperatingSystem.WINDOWS].forEach((os) => {
          const bodyMsg3 = createNewTrustedApp({
            os,
            entries: [
              createConditionEntry({ field: ConditionEntryField.PATH, value: '/tmp/dir1' }),
            ],
          });

          expect(() => body.validate(bodyMsg3)).not.toThrow();
        });
      });

      it('should validate `entry.field` accepts signer field name for windows os value', () => {
        const bodyMsg3 = createNewTrustedApp({
          os: 'windows',
          entries: [
            createConditionEntry({ field: ConditionEntryField.SIGNER, value: 'Microsoft' }),
          ],
        });

        expect(() => body.validate(bodyMsg3)).not.toThrow();
      });

      it('should validate `entry.field` does not accept signer field name for linux and macos os values', () => {
        [OperatingSystem.LINUX, OperatingSystem.MAC].forEach((os) => {
          const bodyMsg3 = createNewTrustedApp({
            os,
            entries: [
              createConditionEntry({ field: ConditionEntryField.SIGNER, value: 'Microsoft' }),
            ],
          });

          expect(() => body.validate(bodyMsg3)).toThrow();
        });
      });

      it('should validate `entry.type` does not accept unknown values', () => {
        const bodyMsg = createNewTrustedApp({
          entries: [createConditionEntry({ type: 'invalid' })],
        });
        expect(() => body.validate(bodyMsg)).toThrow();
      });

      it('should validate `entry.type` accepts known values', () => {
        const bodyMsg = createNewTrustedApp({
          entries: [createConditionEntry({ type: 'match' })],
        });
        expect(() => body.validate(bodyMsg)).not.toThrow();
      });

      it('should validate `entry.operator` does not accept unknown values', () => {
        const bodyMsg = createNewTrustedApp({
          entries: [createConditionEntry({ operator: 'invalid' })],
        });
        expect(() => body.validate(bodyMsg)).toThrow();
      });

      it('should validate `entry.operator` accepts known values', () => {
        const bodyMsg = createNewTrustedApp({
          entries: [createConditionEntry({ operator: 'included' })],
        });
        expect(() => body.validate(bodyMsg)).not.toThrow();
      });

      it('should validate `entry.type` does not accept `wildcard` when field is NOT PATH', () => {
        const bodyMsg = createNewTrustedApp({
          entries: [
            createConditionEntry({
              field: ConditionEntryField.HASH,
              type: 'wildcard',
            }),
          ],
        });
        expect(() => body.validate(bodyMsg)).toThrow();
      });

      it('should validate `entry.type` accepts `wildcard` when field is PATH', () => {
        const bodyMsg = createNewTrustedApp({
          entries: [
            createConditionEntry({
              field: ConditionEntryField.PATH,
              type: 'wildcard',
            }),
          ],
        });
        expect(() => body.validate(bodyMsg)).not.toThrow();
      });

      it('should validate `entry.value` required', () => {
        const { value, ...entry } = createConditionEntry();
        expect(() => body.validate(createNewTrustedApp({ entries: [entry] }))).toThrow();
      });

      it('should validate `entry.value` is non-empty', () => {
        const bodyMsg = createNewTrustedApp({ entries: [createConditionEntry({ value: '' })] });
        expect(() => body.validate(bodyMsg)).toThrow();
      });

      it('should validate that `entry.field` path field value can only be used once', () => {
        const bodyMsg = createNewTrustedApp({
          entries: [createConditionEntry(), createConditionEntry()],
        });
        expect(() => body.validate(bodyMsg)).toThrow(
          '[entries]: duplicatedEntry.process.executable.caseless'
        );
      });

      it('should validate that `entry.field` hash field value can only be used once', () => {
        const bodyMsg = createNewTrustedApp({
          entries: [
            createConditionEntry({
              field: ConditionEntryField.HASH,
              value: VALID_HASH_MD5,
            }),
            createConditionEntry({
              field: ConditionEntryField.HASH,
              value: VALID_HASH_MD5,
            }),
          ],
        });
        expect(() => body.validate(bodyMsg)).toThrow('[entries]: duplicatedEntry.process.hash.*');
      });

      it('should validate that `entry.field` signer field value can only be used once', () => {
        const bodyMsg = createNewTrustedApp({
          entries: [
            createConditionEntry({
              field: ConditionEntryField.SIGNER,
              value: 'Microsoft',
            }),
            createConditionEntry({
              field: ConditionEntryField.SIGNER,
              value: 'Microsoft',
            }),
          ],
        });
        expect(() => body.validate(bodyMsg)).toThrow(
          '[entries]: duplicatedEntry.process.Ext.code_signature'
        );
      });

      it('should validate Hash field valid value', () => {
        [VALID_HASH_MD5, VALID_HASH_SHA1, VALID_HASH_SHA256].forEach((value) => {
          expect(() => {
            body.validate(
              createNewTrustedApp({
                entries: [createConditionEntry({ field: ConditionEntryField.HASH, value })],
              })
            );
          }).not.toThrow();
        });
      });

      it('should validate Hash value with invalid length', () => {
        ['xyz', VALID_HASH_SHA256 + VALID_HASH_MD5].forEach((value) => {
          expect(() => {
            body.validate(
              createNewTrustedApp({
                entries: [createConditionEntry({ field: ConditionEntryField.HASH, value })],
              })
            );
          }).toThrow();
        });
      });

      it('should validate Hash value with invalid characters', () => {
        expect(() => {
          body.validate(
            createNewTrustedApp({
              entries: [
                createConditionEntry({
                  field: ConditionEntryField.HASH,
                  value: `G${VALID_HASH_MD5.substr(1)}`,
                }),
              ],
            })
          );
        }).toThrow();
      });
    });
  });

  describe('for PUT Update', () => {
    const createConditionEntry = <T>(data?: T): TrustedAppConditionEntry => ({
      field: ConditionEntryField.PATH,
      type: 'match',
      operator: 'included',
      value: 'c:/programs files/Anti-Virus',
      ...(data || {}),
    });
    const createNewTrustedApp = <T>(data?: T): NewTrustedApp => ({
      name: 'Some Anti-Virus App',
      description: 'this one is ok',
      os: OperatingSystem.WINDOWS,
      effectScope: { type: 'global' },
      entries: [createConditionEntry()],
      ...(data || {}),
    });

    const updateParams = <T>(data?: T): PutTrustedAppsRequestParams => ({
      id: 'validId',
      ...(data || {}),
    });

    const body = PutTrustedAppUpdateRequestSchema.body;
    const params = PutTrustedAppUpdateRequestSchema.params;

    it('should not error on a valid message', () => {
      const bodyMsg = createNewTrustedApp();
      const paramsMsg = updateParams();
      expect(body.validate(bodyMsg)).toStrictEqual(bodyMsg);
      expect(params.validate(paramsMsg)).toStrictEqual(paramsMsg);
    });

    it('should validate `id` params is required', () => {
      expect(() => params.validate(updateParams({ id: undefined }))).toThrow();
    });

    it('should validate `id` params to be string', () => {
      expect(() => params.validate(updateParams({ id: 1 }))).toThrow();
    });

    it('should validate `version`', () => {
      const bodyMsg = createNewTrustedApp({ version: 'v1' });
      expect(body.validate(bodyMsg)).toStrictEqual(bodyMsg);
    });

    it('should validate `version` must be string', () => {
      const bodyMsg = createNewTrustedApp({ version: 1 });
      expect(() => body.validate(bodyMsg)).toThrow();
    });
  });
});
