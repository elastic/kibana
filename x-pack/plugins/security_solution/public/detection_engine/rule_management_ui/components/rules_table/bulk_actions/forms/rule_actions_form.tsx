/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type {
  RuleAction,
  ActionTypeRegistryContract,
} from '@kbn/triggers-actions-ui-plugin/public';

import type { FormSchema } from '../../../../../../shared_imports';
import {
  useForm,
  UseField,
  FIELD_TYPES,
  useFormData,
  getUseField,
  Field,
} from '../../../../../../shared_imports';
import { BulkActionEditType } from '../../../../../../../common/detection_engine/rule_management/api/rules/bulk_actions/request_schema';
import type { BulkActionEditPayload } from '../../../../../../../common/detection_engine/rule_management/api/rules/bulk_actions/request_schema';

import { BulkEditFormWrapper } from './bulk_edit_form_wrapper';
import { bulkAddRuleActions as i18n } from '../translations';

import { useKibana } from '../../../../../../common/lib/kibana';

import { getAllActionMessageParams } from '../../../../../../detections/pages/detection_engine/rules/helpers';

import { RuleActionsField } from '../../../../../../detections/components/rules/rule_actions_field';
import { debouncedValidateRuleActionsField } from '../../../../../../detections/containers/detection_engine/rules/validate_rule_actions_field';

const CommonUseField = getUseField({ component: Field });

type BulkActionsRuleAction = RuleAction & Required<Pick<RuleAction, 'frequency'>>;

export interface RuleActionsFormData {
  actions: BulkActionsRuleAction[];
  overwrite: boolean;
}

const getFormSchema = (
  actionTypeRegistry: ActionTypeRegistryContract
): FormSchema<RuleActionsFormData> => ({
  actions: {
    validations: [
      {
        // Debounced validator not explicitly necessary here as the `RuleActionsFormData` form doesn't exhibit the same
        // behavior as the `ActionsStepRule` form outlined in https://github.com/elastic/kibana/issues/142217, however
        // additional renders are prevented so using for consistency
        validator: debouncedValidateRuleActionsField(actionTypeRegistry),
      },
    ],
  },
  overwrite: {
    type: FIELD_TYPES.CHECKBOX,
    label: i18n.OVERWRITE_LABEL,
  },
});

const defaultFormData: RuleActionsFormData = {
  actions: [],
  overwrite: false,
};

interface RuleActionsFormProps {
  rulesCount: number;
  onClose: () => void;
  onConfirm: (bulkActionEditPayload: BulkActionEditPayload) => void;
}

const RuleActionsFormComponent = ({ rulesCount, onClose, onConfirm }: RuleActionsFormProps) => {
  const {
    services: {
      triggersActionsUi: { actionTypeRegistry },
    },
  } = useKibana();

  const formSchema = useMemo(() => getFormSchema(actionTypeRegistry), [actionTypeRegistry]);

  const { form } = useForm({
    schema: formSchema,
    defaultValue: defaultFormData,
  });

  const [{ overwrite }] = useFormData({ form, watch: ['overwrite', 'throttle'] });

  const handleSubmit = useCallback(async () => {
    const { data, isValid } = await form.submit();
    if (!isValid) {
      return;
    }

    const { actions = [], overwrite: overwriteValue } = data;
    const editAction = overwriteValue
      ? BulkActionEditType.set_rule_actions
      : BulkActionEditType.add_rule_actions;

    onConfirm({
      type: editAction,
      value: {
        actions: actions.map(({ actionTypeId, ...action }) => action),
      },
    });
  }, [form, onConfirm]);

  const messageVariables = useMemo(() => getAllActionMessageParams(), []);

  return (
    <BulkEditFormWrapper
      form={form}
      title={i18n.FORM_TITLE}
      onClose={onClose}
      onSubmit={handleSubmit}
      flyoutSize="l"
    >
      <EuiCallOut
        color="primary"
        data-test-subj="bulkEditRulesRuleActionInfo"
        title={
          <FormattedMessage
            id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.edit.addRuleActions.infoCalloutTitle"
            defaultMessage="Configure actions for {rulesCount, plural, one {# rule} other {# rules}} you’ve selected"
            values={{ rulesCount }}
          />
        }
      >
        <ul>
          <li>{i18n.RULE_VARIABLES_DETAIL}</li>
        </ul>
      </EuiCallOut>
      <EuiSpacer size="m" />

      <UseField
        path="actions"
        component={RuleActionsField}
        componentProps={{
          messageVariables,
          summaryMessageVariables: messageVariables,
        }}
      />
      <EuiSpacer size="m" />

      <CommonUseField
        path="overwrite"
        componentProps={{
          idAria: 'bulkEditRulesOverwriteRuleActions',
          'data-test-subj': 'bulkEditRulesOverwriteRuleActions',
        }}
      />

      {overwrite && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut color="warning" data-test-subj="bulkEditRulesRuleActionsWarning">
            <FormattedMessage
              id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.edit.addRuleActions.warningCalloutMessage"
              defaultMessage="You're about to overwrite rule actions for {rulesCount, plural, one {# selected rule} other {# selected rules}}. Click {saveButton} to apply changes."
              values={{
                rulesCount,
                saveButton: (
                  <strong>
                    <FormattedMessage
                      id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.edit.addRuleActions.warningCalloutMessage.buttonLabel"
                      defaultMessage="Save"
                    />
                  </strong>
                ),
              }}
            />
          </EuiCallOut>
        </>
      )}
    </BulkEditFormWrapper>
  );
};

export const RuleActionsForm = React.memo(RuleActionsFormComponent);
RuleActionsForm.displayName = 'RuleActionsForm';
