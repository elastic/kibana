/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GetTrustedAppsRequestSchema, PostTrustedAppCreateRequestSchema } from './trusted_apps';

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

  describe('for POST Create', () => {
    const getCreateTrustedAppItem = () => ({
      name: 'Some Anti-Virus App',
      description: 'this one is ok',
      os: 'windows',
      entries: [
        {
          field: 'path',
          type: 'match',
          operator: 'included',
          value: 'c:/programs files/Anti-Virus',
        },
      ],
    });
    const body = PostTrustedAppCreateRequestSchema.body;

    it('should not error on a valid message', () => {
      const bodyMsg = getCreateTrustedAppItem();
      expect(body.validate(bodyMsg)).toStrictEqual(bodyMsg);
    });

    it('should validate `name` is required', () => {
      const bodyMsg = {
        ...getCreateTrustedAppItem(),
        name: undefined,
      };
      expect(() => body.validate(bodyMsg)).toThrow();
    });

    it('should validate `name` value to be non-empty', () => {
      const bodyMsg = {
        ...getCreateTrustedAppItem(),
        name: '',
      };
      expect(() => body.validate(bodyMsg)).toThrow();
    });

    it('should validate `description` as optional', () => {
      const { description, ...bodyMsg } = getCreateTrustedAppItem();
      expect(body.validate(bodyMsg)).toStrictEqual(bodyMsg);
    });

    it('should validate `description` to be non-empty if defined', () => {
      const bodyMsg = {
        ...getCreateTrustedAppItem(),
        description: '',
      };
      expect(() => body.validate(bodyMsg)).toThrow();
    });

    it('should validate `os` to to only accept known values', () => {
      const bodyMsg = {
        ...getCreateTrustedAppItem(),
        os: undefined,
      };
      expect(() => body.validate(bodyMsg)).toThrow();

      const bodyMsg2 = {
        ...bodyMsg,
        os: '',
      };
      expect(() => body.validate(bodyMsg2)).toThrow();

      const bodyMsg3 = {
        ...bodyMsg,
        os: 'winz',
      };
      expect(() => body.validate(bodyMsg3)).toThrow();

      ['linux', 'macos', 'windows'].forEach((os) => {
        expect(() => {
          body.validate({
            ...bodyMsg,
            os,
          });
        }).not.toThrow();
      });
    });

    it('should validate `entries` as required', () => {
      const bodyMsg = {
        ...getCreateTrustedAppItem(),
        entries: undefined,
      };
      expect(() => body.validate(bodyMsg)).toThrow();

      const { entries, ...bodyMsg2 } = getCreateTrustedAppItem();
      expect(() => body.validate(bodyMsg2)).toThrow();
    });

    it('should validate `entries` to have at least 1 item', () => {
      const bodyMsg = {
        ...getCreateTrustedAppItem(),
        entries: [],
      };
      expect(() => body.validate(bodyMsg)).toThrow();
    });

    describe('when `entries` are defined', () => {
      const getTrustedAppItemEntryItem = () => getCreateTrustedAppItem().entries[0];

      it('should validate `entry.field` is required', () => {
        const { field, ...entry } = getTrustedAppItemEntryItem();
        const bodyMsg = {
          ...getCreateTrustedAppItem(),
          entries: [entry],
        };
        expect(() => body.validate(bodyMsg)).toThrow();
      });

      it('should validate `entry.field` is limited to known values', () => {
        const bodyMsg = {
          ...getCreateTrustedAppItem(),
          entries: [
            {
              ...getTrustedAppItemEntryItem(),
              field: '',
            },
          ],
        };
        expect(() => body.validate(bodyMsg)).toThrow();

        const bodyMsg2 = {
          ...getCreateTrustedAppItem(),
          entries: [
            {
              ...getTrustedAppItemEntryItem(),
              field: 'invalid value',
            },
          ],
        };
        expect(() => body.validate(bodyMsg2)).toThrow();

        ['hash', 'path'].forEach((field) => {
          const bodyMsg3 = {
            ...getCreateTrustedAppItem(),
            entries: [
              {
                ...getTrustedAppItemEntryItem(),
                field,
              },
            ],
          };

          expect(() => body.validate(bodyMsg3)).not.toThrow();
        });
      });

      it.todo('should validate `entry.type` is limited to known values');

      it.todo('should validate `entry.operator` is limited to known values');

      it('should validate `entry.value` required', () => {
        const { value, ...entry } = getTrustedAppItemEntryItem();
        const bodyMsg = {
          ...getCreateTrustedAppItem(),
          entries: [entry],
        };
        expect(() => body.validate(bodyMsg)).toThrow();
      });

      it('should validate `entry.value` is non-empty', () => {
        const bodyMsg = {
          ...getCreateTrustedAppItem(),
          entries: [
            {
              ...getTrustedAppItemEntryItem(),
              value: '',
            },
          ],
        };
        expect(() => body.validate(bodyMsg)).toThrow();
      });
    });
  });
});
