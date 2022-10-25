/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Either, fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import * as rt from 'io-ts';
import { exactCheck } from '@kbn/securitysolution-io-ts-utils';
import { identity } from 'fp-ts/lib/function';
import { isEmpty, isObject } from 'lodash';
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
  rt.exact(
    rt.partial({
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
    })
  ),
]);

export const formatErrors = (errors: rt.Errors): string[] => {
  const err = errors.map((error) => {
    if (error.message != null) {
      return error.message;
    } else {
      const keyContext = error.context
        .filter(
          (entry) => entry.key != null && !Number.isInteger(+entry.key) && entry.key.trim() !== ''
        )
        .map((entry) => entry.key)
        .join('.');

      const nameContext = error.context.find(
        (entry) => entry.type != null && entry.type.name != null && entry.type.name.length > 0
      );

      const suppliedValue =
        keyContext !== '' ? keyContext : nameContext != null ? nameContext.type.name : '';
      const value = isObject(error.value) ? JSON.stringify(error.value) : error.value;
      return `Invalid value "${value}" supplied to "${suppliedValue}"`;
    }
  });

  return [...new Set(err)];
};

type CreateAlertSchemaType = rt.TypeOf<typeof CreateAlertSchema>;

export const decodeCreateAlert = (data: unknown): CreateAlertSchemaType => {
  const onLeft = (errors: rt.Errors) => {
    throw new DecodeError(formatErrors(errors));
  };

  const onRight = (a: CreateAlertSchemaType): CreateAlertSchemaType => identity(a);

  return pipe(
    CreateAlertSchema.decode(data),
    (decoded) => exactCheck(data, decoded),
    fold(onLeft, onRight)
  );
};

export class DecodeError extends Error {
  constructor(public readonly decodeErrors: string[]) {
    super(decodeErrors.join());
    this.name = this.constructor.name;
  }
}

export function isDecodeError(error: unknown): error is DecodeError {
  return error instanceof DecodeError;
}
