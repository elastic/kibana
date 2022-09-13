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
import type { FormSchema } from '../../../../../../../shared_imports';
import {
  useForm,
  UseField,
  FIELD_TYPES,
  useFormData,
  getUseField,
  Field,
} from '../../../../../../../shared_imports';
import type { BulkActionEditPayload } from '../../../../../../../../common/detection_engine/schemas/request/perform_bulk_action_schema';
import { BulkActionEditType } from '../../../../../../../../common/detection_engine/schemas/request/perform_bulk_action_schema';
import { NOTIFICATION_THROTTLE_NO_ACTIONS } from '../../../../../../../../common/constants';

import { BulkEditFormWrapper } from './bulk_edit_form_wrapper';
import { bulkAddRuleActions as i18n } from '../translations';

import { useKibana } from '../../../../../../../common/lib/kibana';

import {
  ThrottleSelectField,
  THROTTLE_OPTIONS_FOR_BULK_RULE_ACTIONS,
} from '../../../../../../components/rules/throttle_select_field';
import { getAllActionMessageParams } from '../../../helpers';

import { RuleActionsField } from '../../../../../../components/rules/rule_actions_field';
import { validateRuleActionsField } from '../../../../../../containers/detection_engine/rules/validate_rule_actions_field';

const CommonUseField = getUseField({ component: Field });

export interface RuleActionsFormData {
  throttle: string;
  actions: RuleAction[];
  overwrite: boolean;
}

const getFormSchema = (
  actionTypeRegistry: ActionTypeRegistryContract
): FormSchema<RuleActionsFormData> => ({
  throttle: {
    label: i18n.THROTTLE_LABEL,
    helpText: i18n.THROTTLE_HELP_TEXT,
  },
  actions: {
    validations: [
      {
        validator: validateRuleActionsField(actionTypeRegistry),
      },
    ],
  },
  overwrite: {
    type: FIELD_TYPES.CHECKBOX,
    label: i18n.OVERWRITE_LABEL,
  },
});

const defaultFormData: RuleActionsFormData = {
  throttle: NOTIFICATION_THROTTLE_NO_ACTIONS,
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

  const [{ overwrite, throttle }] = useFormData({ form, watch: ['overwrite', 'throttle'] });

  const handleSubmit = useCallback(async () => {
    const { data, isValid } = await form.submit();
    if (!isValid) {
      return;
    }

    const { actions = [], throttle: throttleToSubmit, overwrite: overwriteValue } = data;
    const editAction = overwriteValue
      ? BulkActionEditType.set_rule_actions
      : BulkActionEditType.add_rule_actions;

    onConfirm({
      type: editAction,
      value: {
        actions: actions.map(({ actionTypeId, ...action }) => action),
        throttle: throttleToSubmit,
      },
    });
  }, [form, onConfirm]);

  const throttleFieldComponentProps = useMemo(
    () => ({
      idAria: 'bulkEditRulesRuleActionThrottle',
      dataTestSubj: 'bulkEditRulesRuleActionThrottle',
      hasNoInitialSelection: false,
      euiFieldProps: {
        options: THROTTLE_OPTIONS_FOR_BULK_RULE_ACTIONS,
      },
    }),
    []
  );

  const messageVariables = useMemo(() => getAllActionMessageParams(), []);

  const showActionsSelect = throttle !== NOTIFICATION_THROTTLE_NO_ACTIONS;

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
          <li>
            <FormattedMessage
              id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.edit.addRuleActions.actionFrequencyDetail"
              defaultMessage="The actions frequency you select below is applied to all actions (both new and existing) for all selected rules."
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.edit.addRuleActions.deleteActionsDetail"
              defaultMessage="To delete actions for all selected rules, select {noActionsOption} in the menu and check {overwriteActionsCheckbox}."
              values={{
                noActionsOption: (
                  <strong>
                    <FormattedMessage
                      id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.edit.addRuleActions.deleteActionsDetail.menuOptionLabel"
                      defaultMessage="Perform no actions"
                    />
                  </strong>
                ),
                overwriteActionsCheckbox: (
                  <strong>
                    <FormattedMessage
                      id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.edit.addRuleActions.deleteActionsDetail.overwriteActionsCheckboxLabel"
                      defaultMessage="Overwrite all selected rule actions"
                    />
                  </strong>
                ),
              }}
            />
          </li>
          <li>{i18n.RULE_VARIABLES_DETAIL}</li>
        </ul>
      </EuiCallOut>
      <EuiSpacer size="m" />

      <UseField
        path="throttle"
        component={ThrottleSelectField}
        componentProps={throttleFieldComponentProps}
      />
      <EuiSpacer size="m" />

      {showActionsSelect && (
        <>
          <UseField
            path="actions"
            component={RuleActionsField}
            componentProps={{
              messageVariables,
            }}
          />
          <EuiSpacer size="m" />
        </>
      )}

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
