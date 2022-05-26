/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AlertsTableFlyoutBaseProps } from '@kbn/triggers-actions-ui-plugin/public';
import { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common/parse_technical_fields';
import { ParsedExperimentalFields } from '@kbn/rule-registry-plugin/common/parse_experimental_fields';
import { EcsFieldsResponse } from '@kbn/rule-registry-plugin/common/search_strategy';

export type FlyoutProps = AlertsTableFlyoutBaseProps & {
  alert: EcsFieldsResponse & {
    fields: ParsedTechnicalFields & ParsedExperimentalFields;
    start: number;
    reason: string;
    link?: string;
    active: boolean;
  };
};
