/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  TextAreaWithMessageVariables,
  TextFieldWithMessageVariables,
} from '@kbn/triggers-actions-ui-plugin/public';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSpacer } from '@elastic/eui';

import * as i18n from './translations';
import { CreateAlertProps } from '.';

type AdditionalOptionsProps = Pick<
  CreateAlertProps,
  'subActionParams' | 'editOptionalSubAction' | 'messageVariables' | 'index' | 'warnings'
>;

const AdditionalOptionsComponent: React.FC<AdditionalOptionsProps> = ({
  subActionParams,
  editOptionalSubAction,
  messageVariables,
  index,
  warnings,
}) => {
  return (
    <>
      <EuiSpacer size={'m'} />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            data-test-subj="opsgenie-entity-row"
            fullWidth
            label={i18n.ENTITY_FIELD_LABEL}
            helpText={i18n.OPSGENIE_ENTITY_HELP}
          >
            <TextFieldWithMessageVariables
              index={index}
              editAction={editOptionalSubAction}
              messageVariables={messageVariables}
              paramsProperty={'entity'}
              inputTargetValue={subActionParams?.entity}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            data-test-subj="opsgenie-source-row"
            fullWidth
            label={i18n.SOURCE_FIELD_LABEL}
            helpText={i18n.OPSGENIE_SOURCE_HELP}
          >
            <TextFieldWithMessageVariables
              index={index}
              editAction={editOptionalSubAction}
              messageVariables={messageVariables}
              paramsProperty={'source'}
              inputTargetValue={subActionParams?.source}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFormRow
        data-test-subj="opsgenie-user-row"
        fullWidth
        label={i18n.USER_FIELD_LABEL}
        helpText={i18n.OPSGENIE_USER_HELP}
      >
        <TextFieldWithMessageVariables
          index={index}
          editAction={editOptionalSubAction}
          messageVariables={messageVariables}
          paramsProperty={'user'}
          inputTargetValue={subActionParams?.user}
        />
      </EuiFormRow>
      <TextAreaWithMessageVariables
        index={index}
        editAction={editOptionalSubAction}
        messageVariables={messageVariables}
        paramsProperty={'note'}
        inputTargetValue={subActionParams?.note}
        label={i18n.NOTE_FIELD_LABEL}
        warning={warnings.note}
      />
    </>
  );
};

AdditionalOptionsComponent.displayName = 'AdditionalOptions';

export const AdditionalOptions = React.memo(AdditionalOptionsComponent);
