/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { NonEmptyString } from '@kbn/securitysolution-io-ts-types';

/**
 * Almost all types of Security rules check source event documents for a match to some kind of
 * query or filter. If a document has certain field with certain values, then it's a match and
 * the rule will generate an alert.
 *
 * Required field is an event field that must be present in the source indices of a given rule.
 *
 * @example
 * const standardEcsField: RequiredField = {
 *   name: 'event.action',
 *   type: 'keyword',
 *   ecs: true,
 * };
 *
 * @example
 * const nonEcsField: RequiredField = {
 *   name: 'winlog.event_data.AttributeLDAPDisplayName',
 *   type: 'keyword',
 *   ecs: false,
 * };
 */
export type RequiredField = t.TypeOf<typeof RequiredField>;
export const RequiredField = t.exact(
  t.type({
    name: NonEmptyString,
    type: NonEmptyString,
    ecs: t.boolean,
  })
);

/**
 * Array of event fields that must be present in the source indices of a given rule.
 *
 * @example
 * const x: RequiredFieldArray = [
 *   {
 *     name: 'event.action',
 *     type: 'keyword',
 *     ecs: true,
 *   },
 *   {
 *     name: 'event.code',
 *     type: 'keyword',
 *     ecs: true,
 *   },
 *   {
 *     name: 'winlog.event_data.AttributeLDAPDisplayName',
 *     type: 'keyword',
 *     ecs: false,
 *   },
 * ];
 */
export type RequiredFieldArray = t.TypeOf<typeof RequiredFieldArray>;
export const RequiredFieldArray = t.array(RequiredField);
