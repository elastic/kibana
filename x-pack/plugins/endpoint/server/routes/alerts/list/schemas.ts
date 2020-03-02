/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { decode } from 'rison-node';
import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { esKuery } from '../../../../../../../src/plugins/data/server';
import { EndpointAppConstants } from '../../../../common/types';

export const alertListReqSchema = schema.object(
  {
    page_size: schema.number({
      min: 1,
      max: 100,
      defaultValue: EndpointAppConstants.ALERT_LIST_DEFAULT_PAGE_SIZE,
    }),
    page_index: schema.maybe(
      schema.number({
        min: 0,
      })
    ),
    after: schema.maybe(
      schema.arrayOf(schema.string(), {
        minSize: 2,
        maxSize: 2,
      })
    ),
    before: schema.maybe(
      schema.arrayOf(schema.string(), {
        minSize: 2,
        maxSize: 2,
      })
    ),
    empty_string_is_undefined: schema.maybe(schema.boolean()),
    sort: schema.string({
      defaultValue: EndpointAppConstants.ALERT_LIST_DEFAULT_SORT,
    }),
    order: schema.string({
      defaultValue: EndpointAppConstants.ALERT_LIST_DEFAULT_ORDER,
      validate(value) {
        if (value !== 'asc' && value !== 'desc') {
          return i18n.translate('xpack.endpoint.alerts.errors.bad_sort_direction', {
            defaultMessage: 'must be `asc` or `desc`',
          });
        }
      },
    }),
    query: schema.maybe(
      schema.string({
        validate(value) {
          try {
            esKuery.fromKueryExpression(value);
          } catch (err) {
            return i18n.translate('xpack.endpoint.alerts.errors.bad_kql', {
              defaultMessage: 'must be valid KQL',
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
    // No default provided here, because the value comes from the config, which is loaded later.
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
