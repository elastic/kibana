/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  ActionParamsProps,
  TextAreaWithMessageVariables,
  TextFieldWithMessageVariables,
} from '@kbn/triggers-actions-ui-plugin/public';
import {
  EuiAccordion,
  EuiFormRow,
  EuiSpacer,
  RecursivePartial,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type {
  OpsgenieActionParams,
  OpsgenieCloseAlertParams,
} from '../../../../server/connector_types/stack';
import * as i18n from './translations';

type CloseAlertProps = Omit<
  ActionParamsProps<OpsgenieActionParams>,
  'actionParams' | 'editAction'
> & {
  subActionParams?: RecursivePartial<OpsgenieCloseAlertParams>;
  editSubAction: ActionParamsProps<OpsgenieActionParams>['editAction'];
  editOptionalSubAction: ActionParamsProps<OpsgenieActionParams>['editAction'];
};

const CloseAlertComponent: React.FC<CloseAlertProps> = ({
  editSubAction,
  editOptionalSubAction,
  errors,
  index,
  messageVariables,
  subActionParams,
}) => {
  const isAliasInvalid =
    errors['subActionParams.alias'] !== undefined &&
    errors['subActionParams.alias'].length > 0 &&
    subActionParams?.alias !== undefined;

  const accordionId = useGeneratedHtmlId({ prefix: `closeAlertEditor-${index}` });

  return (
    <>
      <EuiFormRow
        data-test-subj="opsgenie-alias-row"
        fullWidth
        error={errors['subActionParams.alias']}
        isInvalid={isAliasInvalid}
        label={i18n.ALIAS_FIELD_LABEL}
      >
        <TextFieldWithMessageVariables
          index={index}
          editAction={editSubAction}
          messageVariables={messageVariables}
          paramsProperty={'alias'}
          inputTargetValue={subActionParams?.alias}
          errors={errors['subActionParams.alias'] as string[]}
        />
      </EuiFormRow>
      <TextAreaWithMessageVariables
        index={index}
        editAction={editOptionalSubAction}
        messageVariables={messageVariables}
        paramsProperty={'note'}
        inputTargetValue={subActionParams?.note}
        label={i18n.NOTE_FIELD_LABEL}
      />

      <EuiSpacer size={'m'} />
      <EuiAccordion
        id={accordionId}
        buttonContent={i18n.ADVANCED_OPTIONS}
        paddingSize={'none'}
        arrowDisplay={'right'}
      >
        <EuiSpacer size={'m'} />
        <EuiFormRow data-test-subj="opsgenie-source-row" fullWidth label={i18n.SOURCE_FIELD_LABEL}>
          <TextFieldWithMessageVariables
            index={index}
            editAction={editOptionalSubAction}
            messageVariables={messageVariables}
            paramsProperty={'source'}
            inputTargetValue={subActionParams?.source}
          />
        </EuiFormRow>
        <EuiFormRow data-test-subj="opsgenie-user-row" fullWidth label={i18n.USER_FIELD_LABEL}>
          <TextFieldWithMessageVariables
            index={index}
            editAction={editOptionalSubAction}
            messageVariables={messageVariables}
            paramsProperty={'user'}
            inputTargetValue={subActionParams?.user}
          />
        </EuiFormRow>
      </EuiAccordion>
    </>
  );
};

CloseAlertComponent.displayName = 'CloseAlert';

export const CloseAlert = React.memo(CloseAlertComponent);
