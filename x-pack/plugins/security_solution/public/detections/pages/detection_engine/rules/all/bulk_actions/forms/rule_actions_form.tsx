/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';

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
import type { BulkActionEditPayload } from '../../../../../../../../common/detection_engine/schemas/common/schemas';
import { BulkActionEditType } from '../../../../../../../../common/detection_engine/schemas/common/schemas';
import { NOTIFICATION_THROTTLE_NO_ACTIONS } from '../../../../../../../../common/constants';

import { BulkEditFormWrapper } from './bulk_edit_form_wrapper';
import { bulkAddRuleActions as i18n } from '../translations';

import { useKibana } from '../../../../../../../common/lib/kibana';

import {
  ThrottleSelectField,
  THROTTLE_OPTIONS,
} from '../../../../../../components/rules/throttle_select_field';
import { allActionMessageParams } from '../../../helpers';

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

    const editAction = data.overwrite
      ? BulkActionEditType.set_rule_actions
      : BulkActionEditType.add_rule_actions;

    onConfirm({
      type: editAction,
      value: {
        actions: data.actions.map(({ actionTypeId, ...action }) => action),
        throttle: data.throttle,
      },
    });
  }, [form, onConfirm]);

  const throttleFieldComponentProps = useMemo(
    () => ({
      idAria: 'bulkEditRulesRuleActionThrottle',
      isLoading: true,
      dataTestSubj: 'bulkEditRulesRuleActionThrottle',
      hasNoInitialSelection: false,
      euiFieldProps: {
        options: THROTTLE_OPTIONS,
      },
    }),
    []
  );

  const showActionsSelect = throttle !== defaultFormData.throttle;

  return (
    <BulkEditFormWrapper
      form={form}
      title={i18n.FORM_TITLE}
      onClose={onClose}
      onSubmit={handleSubmit}
      flyoutSize="l"
    >
      {overwrite && (
        <>
          <EuiCallOut color="warning" data-test-subj="bulkEditRulesRuleActionsWarning">
            {i18n.warningCalloutMessage(rulesCount)}
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}

      <EuiCallOut color="primary" data-test-subj="bulkEditRulesRuleActionInfo">
        {i18n.infoCalloutMessage(rulesCount)}
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
              messageVariables: allActionMessageParams,
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
    </BulkEditFormWrapper>
  );
};

export const RuleActionsForm = React.memo(RuleActionsFormComponent);
RuleActionsForm.displayName = 'RuleActionsForm';
