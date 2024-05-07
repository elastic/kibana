/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { either } from 'fp-ts/lib/Either';
import { i18n } from '@kbn/i18n';
import { PackagePolicyVars, SettingsRow } from '../typings';
import { isSettingsFormValid, OPTIONAL_LABEL } from '../settings_form/utils';

const arrayRegex = new RegExp(/[\[\]]/);
function getAllowedOriginsRt() {
  return new t.Type<string, string, unknown>(
    'allowedOriginsRt',
    t.string.is,
    (input, context) => {
      return either.chain(t.string.validate(input, context), (inputAsString) => {
        return arrayRegex.test(inputAsString)
          ? t.failure(
              input,
              context,
              i18n.translate('xpack.apm.fleet_integration.settings.rum.allowedHeadersValidation', {
                defaultMessage: 'Square brackets not allowed',
              })
            )
          : t.success(inputAsString);
      });
    },
    t.identity
  );
}

const ENABLE_RUM_KEY = 'enable_rum';
export function getRUMSettings(): SettingsRow[] {
  return [
    {
      key: ENABLE_RUM_KEY,
      type: 'boolean',
      rowTitle: i18n.translate('xpack.apm.fleet_integration.settings.rum.enableRumTitle', {
        defaultMessage: 'Enable RUM',
      }),
      rowDescription: i18n.translate(
        'xpack.apm.fleet_integration.settings.rum.enableRumDescription',
        { defaultMessage: 'Enable Real User Monitoring (RUM)' }
      ),
      settings: [
        {
          key: 'rum_allow_origins',
          type: 'combo',
          label: i18n.translate('xpack.apm.fleet_integration.settings.rum.rumAllowOriginsLabel', {
            defaultMessage: 'Allowed Origins',
          }),
          labelAppend: OPTIONAL_LABEL,
          helpText: i18n.translate(
            'xpack.apm.fleet_integration.settings.rum.rumAllowOriginsHelpText',
            {
              defaultMessage: 'Allowed Origin headers to be sent by User Agents.',
            }
          ),
          validation: getAllowedOriginsRt(),
        },
        {
          key: 'rum_allow_headers',
          type: 'combo',
          label: i18n.translate('xpack.apm.fleet_integration.settings.rum.rumAllowHeaderLabel', {
            defaultMessage: 'Access-Control-Allow-Headers',
          }),
          labelAppend: OPTIONAL_LABEL,
          helpText: i18n.translate(
            'xpack.apm.fleet_integration.settings.rum.rumAllowHeaderHelpText',
            {
              defaultMessage:
                'Supported Access-Control-Allow-Headers in addition to "Content-Type", "Content-Encoding" and "Accept".',
            }
          ),
          rowTitle: i18n.translate('xpack.apm.fleet_integration.settings.rum.rumAllowHeaderTitle', {
            defaultMessage: 'Custom headers',
          }),
          rowDescription: i18n.translate(
            'xpack.apm.fleet_integration.settings.rum.rumAllowHeaderDescription',
            { defaultMessage: 'Configure authentication for the agent' }
          ),
        },
        {
          key: 'rum_response_headers',
          type: 'area',
          label: i18n.translate(
            'xpack.apm.fleet_integration.settings.rum.rumResponseHeadersLabel',
            { defaultMessage: 'Custom HTTP response headers' }
          ),
          labelAppend: OPTIONAL_LABEL,
          helpText: i18n.translate(
            'xpack.apm.fleet_integration.settings.rum.rumResponseHeadersHelpText',
            {
              defaultMessage: 'Added to RUM responses, e.g. for security policy compliance.',
            }
          ),
        },
        {
          type: 'advanced_setting',
          settings: [
            {
              key: 'rum_library_pattern',
              type: 'text',
              label: i18n.translate(
                'xpack.apm.fleet_integration.settings.rum.rumLibraryPatternLabel',
                { defaultMessage: 'Library Frame Pattern' }
              ),
              labelAppend: OPTIONAL_LABEL,
              helpText: i18n.translate(
                'xpack.apm.fleet_integration.settings.rum.rumLibraryPatternHelpText',
                {
                  defaultMessage:
                    "Identify library frames by matching a stacktrace frame's file_name and abs_path against this regexp.",
                }
              ),
            },
            {
              key: 'rum_exclude_from_grouping',
              type: 'text',
              label: i18n.translate(
                'xpack.apm.fleet_integration.settings.rum.rumExcludeFromGroupingLabel',
                { defaultMessage: 'Exclude from grouping' }
              ),
              labelAppend: OPTIONAL_LABEL,
              helpText: i18n.translate(
                'xpack.apm.fleet_integration.settings.rum.rumExcludeFromGroupingHelpText',
                {
                  defaultMessage:
                    "Exclude stacktrace frames from error group calculations by matching a stacktrace frame's `file_name` against this regexp.",
                }
              ),
            },
          ],
        },
      ],
    },
  ];
}

export function isRUMFormValid(newVars: PackagePolicyVars, rumSettings: SettingsRow[]) {
  // only validates RUM when its flag is enabled
  return !newVars[ENABLE_RUM_KEY].value || isSettingsFormValid(rumSettings, newVars);
}
