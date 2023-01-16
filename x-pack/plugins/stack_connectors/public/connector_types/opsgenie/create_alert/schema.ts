/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Either } from 'fp-ts/lib/Either';
import * as rt from 'io-ts';
import { isEmpty } from 'lodash';
import { decodeSchema } from '../schema_utils';
import * as i18n from './translations';

const MessageNonEmptyString = new rt.Type<string, string, unknown>(
  'MessageNonEmptyString',
  rt.string.is,
  (input, context): Either<rt.Errors, string> => {
    if (input === undefined) {
      return rt.failure(input, context, i18n.MESSAGE_NOT_DEFINED);
    } else if (typeof input !== 'string') {
      return rt.failure(input, context);
    } else if (isEmpty(input.trim())) {
      return rt.failure(input, context, i18n.MESSAGE_NON_WHITESPACE);
    } else {
      return rt.success(input);
    }
  },
  rt.identity
);

const ResponderTypes = rt.union([
  rt.literal('team'),
  rt.literal('user'),
  rt.literal('escalation'),
  rt.literal('schedule'),
]);

const CreateAlertSchemaOptionalProps = rt.partial(
  rt.type({
    alias: rt.string,
    description: rt.string,
    responders: rt.array(
      rt.union([
        rt.strict({ name: rt.string, type: ResponderTypes }),
        rt.strict({ id: rt.string, type: ResponderTypes }),
        rt.strict({ username: rt.string, type: rt.literal('user') }),
      ])
    ),
    visibleTo: rt.array(
      rt.union([
        rt.strict({ name: rt.string, type: rt.literal('team') }),
        rt.strict({ id: rt.string, type: rt.literal('team') }),
        rt.strict({ id: rt.string, type: rt.literal('user') }),
        rt.strict({ username: rt.string, type: rt.literal('user') }),
      ])
    ),
    actions: rt.array(rt.string),
    tags: rt.array(rt.string),
    details: rt.record(rt.string, rt.string),
    entity: rt.string,
    source: rt.string,
    priority: rt.union([
      rt.literal('P1'),
      rt.literal('P2'),
      rt.literal('P3'),
      rt.literal('P4'),
      rt.literal('P5'),
    ]),
    user: rt.string,
    note: rt.string,
  }).props
);

/**
 * This schema is duplicated from the server. The only difference is that it is using io-ts vs kbn-schema.
 * NOTE: This schema must be the same as defined here: x-pack/plugins/stack_connectors/server/connector_types/stack/opsgenie/schema.ts
 *
 * The reason it is duplicated here is because the server uses kbn-schema which uses Joi under the hood. If we import
 * Joi on the frontend it will cause ~500KB of data to be loaded on page loads. To avoid this we'll use io-ts in the frontend.
 * Ideally we could use io-ts in the backend as well but the server requires kbn-schema to be used.
 *
 * Issue: https://github.com/elastic/kibana/issues/143891
 *
 * For more information on the Opsgenie create alert schema see: https://docs.opsgenie.com/docs/alert-api#create-alert
 */
const CreateAlertSchema = rt.intersection([
  rt.strict({ message: MessageNonEmptyString }),
  rt.exact(CreateAlertSchemaOptionalProps),
]);

type CreateAlertSchemaType = rt.TypeOf<typeof CreateAlertSchema>;

/**
 * This schema should match CreateAlertSchema except that all fields are optional and message is only enforced as a string.
 * Enforcing message as only a string accommodates the following scenario:
 *
 * If a user deletes an action in the rule form at index 0, and the
 * action at index 1 had the message field specified with all spaces, the message field is technically invalid but
 * we want to allow it to pass the partial check so that the form is still populated with the invalid value. Otherwise the
 * forum will be reset and the user would lose the information (although it is invalid) they had entered
 */
const PartialCreateAlertSchema = rt.exact(
  rt.intersection([
    rt.partial(rt.type({ message: rt.string }).props),
    CreateAlertSchemaOptionalProps,
  ])
);

type PartialCreateAlertSchemaType = rt.TypeOf<typeof PartialCreateAlertSchema>;

export const isPartialCreateAlertSchema = (data: unknown): data is PartialCreateAlertSchemaType => {
  try {
    decodeSchema(PartialCreateAlertSchema, data);
    return true;
  } catch (error) {
    return false;
  }
};

export const decodeCreateAlert = (data: unknown): CreateAlertSchemaType => {
  return decodeSchema(CreateAlertSchema, data);
};
