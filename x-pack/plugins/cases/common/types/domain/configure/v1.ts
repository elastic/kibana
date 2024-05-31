/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { CaseConnectorRt, ConnectorMappingsRt } from '../connector/v1';
import { UserRt } from '../user/v1';
import { CustomFieldTextTypeRt, CustomFieldToggleTypeRt } from '../custom_field/v1';

export const ClosureTypeRt = rt.union([
  rt.literal('close-by-user'),
  rt.literal('close-by-pushing'),
]);

export const CustomFieldConfigurationWithoutTypeRt = rt.strict({
  /**
   * key of custom field
   */
  key: rt.string,
  /**
   * label of custom field
   */
  label: rt.string,
  /**
   * custom field options - required
   */
  required: rt.boolean,
});

export const TextCustomFieldConfigurationRt = rt.intersection([
  rt.strict({ type: CustomFieldTextTypeRt }),
  CustomFieldConfigurationWithoutTypeRt,
  rt.exact(
    rt.partial({
      defaultValue: rt.union([rt.string, rt.null]),
    })
  ),
]);

export const ToggleCustomFieldConfigurationRt = rt.intersection([
  rt.strict({ type: CustomFieldToggleTypeRt }),
  CustomFieldConfigurationWithoutTypeRt,
  rt.exact(
    rt.partial({
      defaultValue: rt.union([rt.boolean, rt.null]),
    })
  ),
]);

export const CustomFieldConfigurationRt = rt.union([
  TextCustomFieldConfigurationRt,
  ToggleCustomFieldConfigurationRt,
]);

export const CustomFieldsConfigurationRt = rt.array(CustomFieldConfigurationRt);

export const ConfigurationBasicWithoutOwnerRt = rt.strict({
  /**
   * The external connector
   */
  connector: CaseConnectorRt,
  /**
   * Whether to close the case after it has been synced with the external system
   */
  closure_type: ClosureTypeRt,
  /**
   * The custom fields configured for the case
   */
  customFields: CustomFieldsConfigurationRt,
});

export const CasesConfigureBasicRt = rt.intersection([
  ConfigurationBasicWithoutOwnerRt,
  rt.strict({
    /**
     * The plugin owner that manages this configuration
     */
    owner: rt.string,
  }),
]);

export const ConfigurationActivityFieldsRt = rt.strict({
  created_at: rt.string,
  created_by: UserRt,
  updated_at: rt.union([rt.string, rt.null]),
  updated_by: rt.union([UserRt, rt.null]),
});

export const ConfigurationAttributesRt = rt.intersection([
  CasesConfigureBasicRt,
  ConfigurationActivityFieldsRt,
]);

export const ConfigurationRt = rt.intersection([
  ConfigurationAttributesRt,
  rt.strict({
    id: rt.string,
    version: rt.string,
    error: rt.union([rt.string, rt.null]),
    owner: rt.string,
    mappings: ConnectorMappingsRt,
  }),
]);

export const ConfigurationsRt = rt.array(ConfigurationRt);

export type CustomFieldsConfiguration = rt.TypeOf<typeof CustomFieldsConfigurationRt>;
export type CustomFieldConfiguration = rt.TypeOf<typeof CustomFieldConfigurationRt>;
export type ClosureType = rt.TypeOf<typeof ClosureTypeRt>;
export type ConfigurationAttributes = rt.TypeOf<typeof ConfigurationAttributesRt>;
export type Configuration = rt.TypeOf<typeof ConfigurationRt>;
export type Configurations = rt.TypeOf<typeof ConfigurationsRt>;
