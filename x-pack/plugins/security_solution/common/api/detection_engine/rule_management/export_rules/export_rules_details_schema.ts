/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { exportExceptionDetails } from '@kbn/securitysolution-io-ts-list-types';
import { NonEmptyString } from '@kbn/securitysolution-io-ts-types';

const exportRulesDetails = {
  exported_count: t.number,
  exported_rules_count: t.number,
  missing_rules: t.array(
    t.exact(
      t.type({
        rule_id: NonEmptyString,
      })
    )
  ),
  missing_rules_count: t.number,
};
const excludedActionConnectors = t.intersection([
  t.exact(
    t.type({
      id: NonEmptyString,
      type: NonEmptyString,
    })
  ),
  t.exact(t.partial({ reason: t.string })),
]);

const exportRuleActionConnectorsDetails = {
  exported_action_connector_count: t.number,
  missing_action_connection_count: t.number,
  missing_action_connections: t.array(
    t.exact(
      t.type({
        id: NonEmptyString,
        type: NonEmptyString,
      })
    )
  ),
  excluded_action_connection_count: t.number,
  excluded_action_connections: t.array(excludedActionConnectors),
};

// With exceptions and connectors
export const exportRulesDetailsWithExceptionsAndConnectorsSchema = t.intersection([
  t.exact(t.type(exportRulesDetails)),
  t.exact(t.partial(exportExceptionDetails)),
  t.exact(t.partial(exportRuleActionConnectorsDetails)),
]);

export type ExportRulesDetails = t.TypeOf<
  typeof exportRulesDetailsWithExceptionsAndConnectorsSchema
>;
