/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from './api/register_routes';

// TODO: https://github.com/elastic/kibana/pull/142950
// eslint-disable-next-line no-restricted-imports
export { legacyMigrate } from './logic/rule_actions/legacy_action_migration';

// TODO: https://github.com/elastic/kibana/pull/142950
// TODO: Revisit and consider moving to the rule_schema subdomain
export {
  commonParamsCamelToSnake,
  typeSpecificCamelToSnake,
  convertCreateAPIToInternalSchema,
} from './normalization/rule_converters';
