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
  name: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate('xpack.siem.detectionEngine.createRule.stepAboutRule.fieldNameLabel', {
      defaultMessage: 'Name',
    }),
    validations: [
      {
        validator: emptyField(
          i18n.translate(
            'xpack.siem.detectionEngine.createRule.stepAboutRule.nameFieldRequiredError',
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
      'xpack.siem.detectionEngine.createRule.stepAboutRule.fieldDescriptionLabel',
      {
        defaultMessage: 'Description',
      }
    ),
    validations: [
      {
        validator: emptyField(
          i18n.translate(
            'xpack.siem.detectionEngine.createRule.stepAboutRule.descriptionFieldRequiredError',
            {
              defaultMessage: 'A description is required.',
            }
          )
        ),
      },
    ],
  },
  severity: {
    type: FIELD_TYPES.SUPER_SELECT,
    label: i18n.translate(
      'xpack.siem.detectionEngine.createRule.stepAboutRule.fieldSeverityLabel',
      {
        defaultMessage: 'Severity',
      }
    ),
    validations: [
      {
        validator: emptyField(
          i18n.translate(
            'xpack.siem.detectionEngine.createRule.stepAboutRule.severityFieldRequiredError',
            {
              defaultMessage: 'A severity is required.',
            }
          )
        ),
      },
    ],
  },
  riskScore: {
    type: FIELD_TYPES.RANGE,
    label: i18n.translate(
      'xpack.siem.detectionEngine.createRule.stepAboutRule.fieldRiskScoreLabel',
      {
        defaultMessage: 'Risk score',
      }
    ),
  },
  references: {
    label: i18n.translate(
      'xpack.siem.detectionEngine.createRule.stepAboutRule.fieldReferenceUrlsLabel',
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
          (value as string[]).forEach(url => {
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
      'xpack.siem.detectionEngine.createRule.stepAboutRule.fieldFalsePositiveLabel',
      {
        defaultMessage: 'False positive examples',
      }
    ),
    labelAppend: OptionalFieldLabel,
  },
  threat: {
    label: i18n.translate(
      'xpack.siem.detectionEngine.createRule.stepAboutRule.fieldMitreThreatLabel',
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
          (value as IMitreEnterpriseAttack[]).forEach(v => {
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
  tags: {
    type: FIELD_TYPES.COMBO_BOX,
    label: i18n.translate('xpack.siem.detectionEngine.createRule.stepAboutRule.fieldTagsLabel', {
      defaultMessage: 'Tags',
    }),
    helpText: i18n.translate(
      'xpack.siem.detectionEngine.createRule.stepAboutRule.fieldTagsHelpText',
      {
        defaultMessage:
          'Type one or more custom identifying tags for this rule. Press enter after each tag to begin a new one.',
      }
    ),
    labelAppend: OptionalFieldLabel,
  },
  note: {
    type: FIELD_TYPES.TEXTAREA,
    label: i18n.translate('xpack.siem.detectionEngine.createRule.stepAboutRule.guideLabel', {
      defaultMessage: 'Investigation guide',
    }),
    helpText: i18n.translate('xpack.siem.detectionEngine.createRule.stepAboutRule.guideHelpText', {
      defaultMessage:
        'Provide helpful information for analysts that are performing a signal investigation. This guide will appear on both the rule details page and in timelines created from signals generated by this rule.',
    }),
    labelAppend: OptionalFieldLabel,
  },
};
