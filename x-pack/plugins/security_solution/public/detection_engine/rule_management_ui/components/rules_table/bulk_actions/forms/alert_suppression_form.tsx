/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { useKibana } from '../../../../../../common/lib/kibana';
import { DEFAULT_INDEX_KEY } from '../../../../../../../common/constants';
import { METRIC_TYPE, TELEMETRY_EVENT, track } from '../../../../../../common/lib/telemetry';
import * as i18n from '../../../../../../detections/pages/detection_engine/rules/translations';

import { useFetchIndex } from '../../../../../../common/containers/source';

import { BulkActionEditTypeEnum } from '../../../../../../../common/api/detection_engine/rule_management';
import type { BulkActionEditPayload } from '../../../../../../../common/api/detection_engine/rule_management';

import type { FormSchema } from '../../../../../../shared_imports';
import {
  Field,
  getUseField,
  useFormData,
  useForm,
  FIELD_TYPES,
  fieldValidators,
} from '../../../../../../shared_imports';

import { BulkEditFormWrapper } from './bulk_edit_form_wrapper';

const CommonUseField = getUseField({ component: Field });

type AlertSuppressionEditActions =
  | BulkActionEditTypeEnum['add_alert_suppression']
  | BulkActionEditTypeEnum['delete_alert_suppression']
  | BulkActionEditTypeEnum['set_alert_suppression'];

interface AlertSuppressionFormData {
  groupBy: string[];
  overwrite: boolean;
}

const schema: FormSchema<AlertSuppressionFormData> = {
  groupBy: {
    fieldsToValidateOnChange: ['groupBy'],
    type: FIELD_TYPES.COMBO_BOX,
    validations: [
      {
        validator: fieldValidators.emptyField(
          i18n.BULK_EDIT_FLYOUT_FORM_ADD_ALERT_SUPPRESSION_REQUIRED_ERROR
        ),
      },
      {
        validator: fieldValidators.maxLengthField({
          message: i18n.BULK_EDIT_FLYOUT_FORM_ADD_ALERT_SUPPRESSION_MAX_LENGTH_ERROR,
          length: 3,
        }),
      },
    ],
  },
  overwrite: {
    type: FIELD_TYPES.CHECKBOX,
    label: i18n.BULK_EDIT_FLYOUT_FORM_ADD_ALERT_SUPPRESSION_OVERWRITE_LABEL,
  },
};

const initialFormData: AlertSuppressionFormData = {
  groupBy: [],
  overwrite: false,
};

const getFormConfig = (editAction: AlertSuppressionEditActions) =>
  editAction === BulkActionEditTypeEnum.add_alert_suppression
    ? {
        indexLabel: i18n.BULK_EDIT_FLYOUT_FORM_ADD_ALERT_SUPPRESSION_LABEL,
        indexHelpText: i18n.BULK_EDIT_FLYOUT_FORM_ADD_ALERT_SUPPRESSION_HELP_TEXT,
        formTitle: i18n.BULK_EDIT_FLYOUT_FORM_ADD_ALERT_SUPPRESSION_TITLE,
      }
    : {
        indexLabel: i18n.BULK_EDIT_FLYOUT_FORM_DELETE_ALERT_SUPPRESSION_LABEL,
        indexHelpText: i18n.BULK_EDIT_FLYOUT_FORM_DELETE_ALERT_SUPPRESSION_HELP_TEXT,
        formTitle: i18n.BULK_EDIT_FLYOUT_FORM_DELETE_ALERT_SUPPRESSION_TITLE,
      };

interface AlertSuppressionFormProps {
  editAction: AlertSuppressionEditActions;
  rulesCount: number;
  onClose: () => void;
  onConfirm: (bulkActionEditPayload: BulkActionEditPayload) => void;
}

const AlertSuppressionFormComponent = ({
  editAction,
  rulesCount,
  onClose,
  onConfirm,
}: AlertSuppressionFormProps) => {
  const { form } = useForm({
    defaultValue: initialFormData,
    schema,
  });

  const { uiSettings } = useKibana().services;
  const defaultPatterns = uiSettings.get<string[]>(DEFAULT_INDEX_KEY);

  const { indexHelpText, indexLabel, formTitle } = getFormConfig(editAction);

  const [{ overwrite }] = useFormData({
    form,
    watch: ['overwrite'],
  });
  const [_, { indexPatterns }] = useFetchIndex(defaultPatterns, false);
  const fieldOptions = indexPatterns.fields.map((field) => ({
    label: field.name,
  }));

  const handleSubmit = async () => {
    const { data, isValid } = await form.submit();
    if (!isValid) {
      return;
    }

    const event = data.overwrite
      ? TELEMETRY_EVENT.SET_ALERT_SUPPRESSION
      : editAction === 'delete_alert_suppression'
      ? TELEMETRY_EVENT.DELETE_ALERT_SUPPRESSION
      : TELEMETRY_EVENT.ADD_ALERT_SUPPRESSION;
    track(METRIC_TYPE.CLICK, event);

    onConfirm({
      value: { group_by: data.groupBy },
      type: data.overwrite ? BulkActionEditTypeEnum.set_alert_suppression : editAction,
    });
  };

  return (
    <BulkEditFormWrapper form={form} onClose={onClose} onSubmit={handleSubmit} title={formTitle}>
      <CommonUseField
        path="groupBy"
        config={{ ...schema.groupBy, label: indexLabel, helpText: indexHelpText }}
        componentProps={{
          idAria: 'bulkEditRulesAlertSuppression',
          'data-test-subj': 'bulkEditRulesAlertSuppression',
          euiFieldProps: {
            fullWidth: true,
            placeholder: '',
            noSuggestions: false,
            options: fieldOptions,
          },
        }}
      />
      {editAction === BulkActionEditTypeEnum.add_alert_suppression && (
        <CommonUseField
          path="overwrite"
          componentProps={{
            idAria: 'bulkEditRulesOverwriteAlertSuppression',
            'data-test-subj': 'bulkEditRulesOverwriteAlertSuppression',
          }}
        />
      )}
      {overwrite && (
        <EuiFormRow fullWidth>
          <EuiCallOut
            color="warning"
            size="s"
            data-test-subj="bulkEditRulesAlertSuppressionWarning"
          >
            <FormattedMessage
              id="xpack.securitySolution.detectionEngine.components.allRules.bulkActions.bulkEditFlyoutForm.setAlertSuppressionWarningCallout"
              defaultMessage="You’re about to overwrite alert suppression for the {rulesCount, plural, one {# rule} other {# rules}} you selected. To apply and save the changes, click Save."
              values={{ rulesCount }}
            />
          </EuiCallOut>
        </EuiFormRow>
      )}
    </BulkEditFormWrapper>
  );
};

export const AlertSuppressionForm = React.memo(AlertSuppressionFormComponent);
AlertSuppressionForm.displayName = 'AlertSuppressionForm';
