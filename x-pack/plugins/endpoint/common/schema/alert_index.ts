/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, Type } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { decode } from 'rison-node';
import { AlertConstants } from '../alert_constants';

/**
 * Used to validate GET requests against the index of the alerting APIs.
 */
export const alertingIndexGetQuerySchema = schema.object(
  {
    page_size: schema.maybe(
      schema.number({
        min: 1,
        max: 100,
        defaultValue: AlertConstants.ALERT_LIST_DEFAULT_PAGE_SIZE,
      })
    ),
    page_index: schema.maybe(
      schema.number({
        min: 0,
      })
    ),
    after: schema.maybe(
      schema.arrayOf(schema.string(), {
        minSize: 2,
        maxSize: 2,
      }) as Type<[string, string]> // Cast this to a string tuple. `@kbn/config-schema` doesn't do this automatically
    ),
    before: schema.maybe(
      schema.arrayOf(schema.string(), {
        minSize: 2,
        maxSize: 2,
      }) as Type<[string, string]> // Cast this to a string tuple. `@kbn/config-schema` doesn't do this automatically
    ),
    empty_string_is_undefined: schema.maybe(schema.boolean()),
    sort: schema.maybe(schema.string()),
    order: schema.maybe(schema.oneOf([schema.literal('asc'), schema.literal('desc')])),
    query: schema.maybe(
      schema.string({
        validate(value) {
          try {
            decode(value);
          } catch (err) {
            return i18n.translate('xpack.endpoint.alerts.errors.bad_rison', {
              defaultMessage: 'must be a valid rison-encoded string',
            });
          }
        },
      })
    ),

    // rison-encoded string
    filters: schema.maybe(
      schema.string({
        validate(value) {
          try {
            decode(value);
          } catch (err) {
            return i18n.translate('xpack.endpoint.alerts.errors.bad_rison', {
              defaultMessage: 'must be a valid rison-encoded string',
            });
          }
        },
      })
    ),

    // rison-encoded string
    date_range: schema.maybe(
      schema.string({
        validate(value) {
          try {
            decode(value);
          } catch (err) {
            return i18n.translate('xpack.endpoint.alerts.errors.bad_rison', {
              defaultMessage: 'must be a valid rison-encoded string',
            });
          }
        },
      })
    ),
  },
  {
    validate(value) {
      if (value.after !== undefined && value.page_index !== undefined) {
        return i18n.translate('xpack.endpoint.alerts.errors.page_index_cannot_be_used_with_after', {
          defaultMessage: '[page_index] cannot be used with [after]',
        });
      }
      if (value.before !== undefined && value.page_index !== undefined) {
        return i18n.translate(
          'xpack.endpoint.alerts.errors.page_index_cannot_be_used_with_before',
          {
            defaultMessage: '[page_index] cannot be used with [before]',
          }
        );
      }
      if (value.before !== undefined && value.after !== undefined) {
        return i18n.translate('xpack.endpoint.alerts.errors.before_cannot_be_used_with_after', {
          defaultMessage: '[before] cannot be used with [after]',
        });
      }
    },
  }
);
