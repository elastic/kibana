/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import {
  FIELD_TYPES,
  fieldValidators,
  FormSchema,
  ValidationFunc,
  ERROR_CODE,
} from '../../../../shared_imports';
import { IMitreEnterpriseAttack } from '../../../pages/detection_engine/rules/types';
import { isMitreAttackInvalid } from '../mitre/helpers';
import { OptionalFieldLabel } from '../optional_field_label';
import { isUrlInvalid } from '../../../../common/utils/validators';
import * as I18n from './translations';

const { emptyField } = fieldValidators;

export const schema: FormSchema = {
  author: {
    type: FIELD_TYPES.COMBO_BOX,
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldAuthorLabel',
      {
        defaultMessage: 'Author',
      }
    ),
    helpText: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldAuthorHelpText',
      {
        defaultMessage:
          'Type one or more author for this rule. Press enter after each author to add a new one.',
      }
    ),
    labelAppend: OptionalFieldLabel,
  },
  name: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldNameLabel',
      {
        defaultMessage: 'Name',
      }
    ),
    validations: [
      {
        validator: emptyField(
          i18n.translate(
            'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.nameFieldRequiredError',
            {
              defaultMessage: 'A name is required.',
            }
          )
        ),
      },
    ],
  },
  description: {
    type: FIELD_TYPES.TEXTAREA,
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldDescriptionLabel',
      {
        defaultMessage: 'Description',
      }
    ),
    validations: [
      {
        validator: emptyField(
          i18n.translate(
            'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.descriptionFieldRequiredError',
            {
              defaultMessage: 'A description is required.',
            }
          )
        ),
      },
    ],
  },
  isBuildingBlock: {
    type: FIELD_TYPES.CHECKBOX,
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldBuildingBlockLabel',
      {
        defaultMessage: 'Mark all generated alerts as "building block" alerts',
      }
    ),
    labelAppend: OptionalFieldLabel,
  },
  severity: {
    value: {
      type: FIELD_TYPES.SUPER_SELECT,
      validations: [
        {
          validator: emptyField(
            i18n.translate(
              'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.severityFieldRequiredError',
              {
                defaultMessage: 'A severity is required.',
              }
            )
          ),
        },
      ],
    },
    mapping: {
      type: FIELD_TYPES.TEXT,
    },
  },
  riskScore: {
    value: {
      type: FIELD_TYPES.RANGE,
      serializer: (input: string) => Number(input),
    },
    mapping: {
      type: FIELD_TYPES.TEXT,
    },
  },
  references: {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldReferenceUrlsLabel',
      {
        defaultMessage: 'Reference URLs',
      }
    ),
    labelAppend: OptionalFieldLabel,
    validations: [
      {
        validator: (
          ...args: Parameters<ValidationFunc>
        ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
          const [{ value, path }] = args;
          let hasError = false;
          (value as string[]).forEach((url) => {
            if (isUrlInvalid(url)) {
              hasError = true;
            }
          });
          return hasError
            ? {
                code: 'ERR_FIELD_FORMAT',
                path,
                message: I18n.URL_FORMAT_INVALID,
              }
            : undefined;
        },
      },
    ],
  },
  falsePositives: {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldFalsePositiveLabel',
      {
        defaultMessage: 'False positive examples',
      }
    ),
    labelAppend: OptionalFieldLabel,
  },
  license: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldLicenseLabel',
      {
        defaultMessage: 'License',
      }
    ),
    helpText: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldLicenseHelpText',
      {
        defaultMessage: 'Add a license name',
      }
    ),
    labelAppend: OptionalFieldLabel,
  },
  ruleNameOverride: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldRuleNameOverrideLabel',
      {
        defaultMessage: 'Rule name override',
      }
    ),
    helpText: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldRuleNameOverrideHelpText',
      {
        defaultMessage:
          'Choose a field from the source event to populate the rule name in the alert list.',
      }
    ),
    labelAppend: OptionalFieldLabel,
  },
  threat: {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldMitreThreatLabel',
      {
        defaultMessage: 'MITRE ATT&CK\\u2122',
      }
    ),
    labelAppend: OptionalFieldLabel,
    validations: [
      {
        validator: (
          ...args: Parameters<ValidationFunc>
        ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
          const [{ value, path }] = args;
          let hasError = false;
          (value as IMitreEnterpriseAttack[]).forEach((v) => {
            if (isMitreAttackInvalid(v.tactic.name, v.technique)) {
              hasError = true;
            }
          });
          return hasError
            ? {
                code: 'ERR_FIELD_MISSING',
                path,
                message: I18n.CUSTOM_MITRE_ATTACK_TECHNIQUES_REQUIRED,
              }
            : undefined;
        },
      },
    ],
  },
  timestampOverride: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldTimestampOverrideLabel',
      {
        defaultMessage: 'Timestamp override',
      }
    ),
    helpText: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldTimestampOverrideHelpText',
      {
        defaultMessage:
          'Choose timestamp field used when executing rule. Pick field with timestamp closest to ingest time (e.g. event.ingested).',
      }
    ),
    labelAppend: OptionalFieldLabel,
  },
  tags: {
    type: FIELD_TYPES.COMBO_BOX,
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldTagsLabel',
      {
        defaultMessage: 'Tags',
      }
    ),
    helpText: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldTagsHelpText',
      {
        defaultMessage:
          'Type one or more custom identifying tags for this rule. Press enter after each tag to begin a new one.',
      }
    ),
    labelAppend: OptionalFieldLabel,
  },
  note: {
    type: FIELD_TYPES.TEXTAREA,
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.guideLabel',
      {
        defaultMessage: 'Investigation guide',
      }
    ),
    helpText: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.guideHelpText',
      {
        defaultMessage:
          'Provide helpful information for analysts that are performing a signal investigation. This guide will appear on both the rule details page and in timelines created from alerts generated by this rule.',
      }
    ),
    labelAppend: OptionalFieldLabel,
  },
};
