/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import {
  MAX_CUSTOM_FIELDS_PER_CASE,
  MAX_CUSTOM_FIELD_KEY_LENGTH,
  MAX_CUSTOM_FIELD_LABEL_LENGTH,
} from '../../../constants';
import { limitedArraySchema, limitedStringSchema, regexStringRt } from '../../../schema';
import { CustomFieldTextTypeRt, CustomFieldToggleTypeRt } from '../../domain';
import type { Configurations, Configuration } from '../../domain/configure/v1';
import { ConfigurationBasicWithoutOwnerRt, ClosureTypeRt } from '../../domain/configure/v1';
import { CaseConnectorRt } from '../../domain/connector/v1';
import { CaseCustomFieldTextWithValidationValueRt } from '../custom_field/v1';

export const CustomFieldConfigurationWithoutTypeRt = rt.strict({
  /**
   * key of custom field
   */
  key: regexStringRt({
    codec: limitedStringSchema({ fieldName: 'key', min: 1, max: MAX_CUSTOM_FIELD_KEY_LENGTH }),
    pattern: '^[a-z0-9_-]+$',
    message: `Key must be lower case, a-z, 0-9, '_', and '-' are allowed`,
  }),
  /**
   * label of custom field
   */
  label: limitedStringSchema({ fieldName: 'label', min: 1, max: MAX_CUSTOM_FIELD_LABEL_LENGTH }),
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
      defaultValue: rt.union([CaseCustomFieldTextWithValidationValueRt('defaultValue'), rt.null]),
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

export const CustomFieldsConfigurationRt = limitedArraySchema({
  codec: rt.union([TextCustomFieldConfigurationRt, ToggleCustomFieldConfigurationRt]),
  min: 0,
  max: MAX_CUSTOM_FIELDS_PER_CASE,
  fieldName: 'customFields',
});

export const ConfigurationRequestRt = rt.intersection([
  rt.strict({
    /**
     * The external connector
     */
    connector: CaseConnectorRt,
    /**
     * Whether to close the case after it has been synced with the external system
     */
    closure_type: ClosureTypeRt,
    /**
     * The plugin owner that manages this configuration
     */
    owner: rt.string,
  }),
  rt.exact(
    rt.partial({
      customFields: CustomFieldsConfigurationRt,
    })
  ),
]);

export const GetConfigurationFindRequestRt = rt.exact(
  rt.partial({
    /**
     * The configuration plugin owner to filter the search by. If this is left empty the results will include all configurations
     * that the user has permissions to access
     */
    owner: rt.union([rt.array(rt.string), rt.string]),
  })
);

export const CaseConfigureRequestParamsRt = rt.strict({
  configuration_id: rt.string,
});

export const ConfigurationPatchRequestRt = rt.intersection([
  rt.exact(
    rt.partial({
      closure_type: ConfigurationBasicWithoutOwnerRt.type.props.closure_type,
      connector: ConfigurationBasicWithoutOwnerRt.type.props.connector,
      customFields: CustomFieldsConfigurationRt,
    })
  ),
  rt.strict({ version: rt.string }),
]);

export type ConfigurationRequest = rt.TypeOf<typeof ConfigurationRequestRt>;
export type ConfigurationPatchRequest = rt.TypeOf<typeof ConfigurationPatchRequestRt>;
export type GetConfigurationFindRequest = rt.TypeOf<typeof GetConfigurationFindRequestRt>;
export type GetConfigureResponse = Configurations;
export type CreateConfigureResponse = Configuration;
export type UpdateConfigureResponse = Configuration;
