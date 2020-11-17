/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GetTrustedAppsRequestSchema, PostTrustedAppCreateRequestSchema } from './trusted_apps';
import { ConditionEntryField } from '../types';

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
          field: ConditionEntryField.PATH,
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
      // Some static hashes for use in validation. Some chr. are in UPPERcase on purpose
      const VALID_HASH_MD5 = '741462ab431a22233C787BAAB9B653C7';
      const VALID_HASH_SHA1 = 'aedb279e378BED6C2DB3C9DC9e12ba635e0b391c';
      const VALID_HASH_SHA256 = 'A4370C0CF81686C0B696FA6261c9d3e0d810ae704ab8301839dffd5d5112f476';

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

        [
          {
            field: ConditionEntryField.HASH,
            value: 'A4370C0CF81686C0B696FA6261c9d3e0d810ae704ab8301839dffd5d5112f476',
          },
          { field: ConditionEntryField.PATH, value: '/tmp/dir1' },
        ].forEach((partialEntry) => {
          const bodyMsg3 = {
            ...getCreateTrustedAppItem(),
            entries: [
              {
                ...getTrustedAppItemEntryItem(),
                ...partialEntry,
              },
            ],
          };

          expect(() => body.validate(bodyMsg3)).not.toThrow();
        });
      });

      it('should validate `entry.type` is limited to known values', () => {
        const bodyMsg = {
          ...getCreateTrustedAppItem(),
          entries: [
            {
              ...getTrustedAppItemEntryItem(),
              type: 'invalid',
            },
          ],
        };
        expect(() => body.validate(bodyMsg)).toThrow();

        // Allow `match`
        const bodyMsg2 = {
          ...getCreateTrustedAppItem(),
          entries: [
            {
              ...getTrustedAppItemEntryItem(),
              type: 'match',
            },
          ],
        };
        expect(() => body.validate(bodyMsg2)).not.toThrow();
      });

      it('should validate `entry.operator` is limited to known values', () => {
        const bodyMsg = {
          ...getCreateTrustedAppItem(),
          entries: [
            {
              ...getTrustedAppItemEntryItem(),
              operator: 'invalid',
            },
          ],
        };
        expect(() => body.validate(bodyMsg)).toThrow();

        // Allow `match`
        const bodyMsg2 = {
          ...getCreateTrustedAppItem(),
          entries: [
            {
              ...getTrustedAppItemEntryItem(),
              operator: 'included',
            },
          ],
        };
        expect(() => body.validate(bodyMsg2)).not.toThrow();
      });

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

      it('should validate that `entry.field` is used only once', () => {
        let bodyMsg = {
          ...getCreateTrustedAppItem(),
          entries: [getTrustedAppItemEntryItem(), getTrustedAppItemEntryItem()],
        };
        expect(() => body.validate(bodyMsg)).toThrow('[Path] field can only be used once');

        bodyMsg = {
          ...getCreateTrustedAppItem(),
          entries: [
            {
              ...getTrustedAppItemEntryItem(),
              field: ConditionEntryField.HASH,
              value: VALID_HASH_MD5,
            },
            {
              ...getTrustedAppItemEntryItem(),
              field: ConditionEntryField.HASH,
              value: VALID_HASH_MD5,
            },
          ],
        };
        expect(() => body.validate(bodyMsg)).toThrow('[Hash] field can only be used once');
      });

      it('should validate Hash field valid value', () => {
        [VALID_HASH_MD5, VALID_HASH_SHA1, VALID_HASH_SHA256].forEach((value) => {
          expect(() => {
            body.validate({
              ...getCreateTrustedAppItem(),
              entries: [
                {
                  ...getTrustedAppItemEntryItem(),
                  field: ConditionEntryField.HASH,
                  value,
                },
              ],
            });
          }).not.toThrow();
        });
      });

      it('should validate Hash value with invalid length', () => {
        ['xyz', VALID_HASH_SHA256 + VALID_HASH_MD5].forEach((value) => {
          expect(() => {
            body.validate({
              ...getCreateTrustedAppItem(),
              entries: [
                {
                  ...getTrustedAppItemEntryItem(),
                  field: ConditionEntryField.HASH,
                  value,
                },
              ],
            });
          }).toThrow();
        });
      });

      it('should validate Hash value with invalid characters', () => {
        expect(() => {
          body.validate({
            ...getCreateTrustedAppItem(),
            entries: [
              {
                ...getTrustedAppItemEntryItem(),
                field: ConditionEntryField.HASH,
                value: `G${VALID_HASH_MD5.substr(1)}`,
              },
            ],
          });
        }).toThrow();
      });

      it('should trim hash value before validation', () => {
        expect(() => {
          body.validate({
            ...getCreateTrustedAppItem(),
            entries: [
              {
                ...getTrustedAppItemEntryItem(),
                field: ConditionEntryField.HASH,
                value: `  ${VALID_HASH_MD5}  \r\n`,
              },
            ],
          });
        }).not.toThrow();
      });
    });
  });
});
