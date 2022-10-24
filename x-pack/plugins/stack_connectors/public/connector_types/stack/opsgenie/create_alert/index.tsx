/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  ActionParamsProps,
  TextAreaWithMessageVariables,
  TextFieldWithMessageVariables,
} from '@kbn/triggers-actions-ui-plugin/public';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSpacer, EuiSwitch } from '@elastic/eui';
import type {
  OpsgenieActionParams,
  OpsgenieCreateAlertParams,
} from '../../../../../server/connector_types/stack';
import * as i18n from '../translations';
import { EditActionCallback } from '../types';
import { DisplayMoreOptions } from '../display_more_options';
import { AdditionalOptions } from './additional_options';
import { JsonEditor } from './json_editor';
import { Tags } from './tags';
import { Priority } from './priority';

type FormViewProps = Omit<CreateAlertProps, 'editAction'>;

const FormView: React.FC<FormViewProps> = ({
  editSubAction,
  editOptionalSubAction,
  errors,
  index,
  messageVariables,
  subActionParams,
}) => {
  const isMessageInvalid =
    errors['subActionParams.message'] !== undefined &&
    errors['subActionParams.message'].length > 0 &&
    subActionParams?.message !== undefined;

  return (
    <>
      <EuiFormRow
        data-test-subj="opsgenie-message-row"
        fullWidth
        error={errors['subActionParams.message']}
        label={i18n.MESSAGE_FIELD_LABEL}
        isInvalid={isMessageInvalid}
      >
        <TextFieldWithMessageVariables
          index={index}
          editAction={editSubAction}
          messageVariables={messageVariables}
          paramsProperty={'message'}
          inputTargetValue={subActionParams?.message}
          errors={errors['subActionParams.message'] as string[]}
        />
      </EuiFormRow>
      <EuiSpacer size={'m'} />
      <EuiFlexGroup>
        <EuiFlexItem>
          <Tags values={subActionParams?.tags ?? []} onChange={editOptionalSubAction} />
        </EuiFlexItem>
        <EuiFlexItem>
          <Priority priority={subActionParams?.priority} onChange={editOptionalSubAction} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <TextAreaWithMessageVariables
        index={index}
        editAction={editOptionalSubAction}
        messageVariables={messageVariables}
        paramsProperty={'description'}
        inputTargetValue={subActionParams?.description}
        label={i18n.DESCRIPTION_FIELD_LABEL}
      />
      <EuiFormRow data-test-subj="opsgenie-alias-row" fullWidth label={i18n.ALIAS_FIELD_LABEL}>
        <TextFieldWithMessageVariables
          index={index}
          editAction={editOptionalSubAction}
          messageVariables={messageVariables}
          paramsProperty={'alias'}
          inputTargetValue={subActionParams?.alias}
        />
      </EuiFormRow>
    </>
  );
};

FormView.displayName = 'FormView';

export type CreateAlertProps = Pick<
  ActionParamsProps<OpsgenieActionParams>,
  'errors' | 'index' | 'messageVariables' | 'editAction'
> & {
  subActionParams?: Partial<OpsgenieCreateAlertParams>;
  editSubAction: EditActionCallback;
  editOptionalSubAction: EditActionCallback;
};

const CreateAlertComponent: React.FC<CreateAlertProps> = ({
  editSubAction,
  editAction,
  editOptionalSubAction,
  errors,
  index,
  messageVariables,
  subActionParams,
}) => {
  const [showingMoreOptions, setShowingMoreOptions] = useState<boolean>(false);
  const [showJsonEditor, setShowJsonEditor] = useState<boolean>(false);

  const toggleShowJsonEditor = useCallback((event) => setShowJsonEditor(event.target.checked), []);
  const toggleShowingMoreOptions = useCallback(
    () => setShowingMoreOptions((previousState) => !previousState),
    []
  );

  return (
    <>
      <EuiSpacer size={'m'} />
      <EuiSwitch
        label={i18n.USE_JSON_EDITOR_LABEL}
        checked={showJsonEditor}
        onChange={toggleShowJsonEditor}
        data-test-subj="opsgenie-show-json-editor-toggle"
      />
      <EuiSpacer size={'m'} />
      {showJsonEditor ? (
        <JsonEditor
          editAction={editAction}
          index={index}
          messageVariables={messageVariables}
          subActionParams={subActionParams}
        />
      ) : (
        <>
          <FormView
            editOptionalSubAction={editOptionalSubAction}
            editSubAction={editSubAction}
            errors={errors}
            index={index}
            messageVariables={messageVariables}
            subActionParams={subActionParams}
          />
          {showingMoreOptions ? (
            <AdditionalOptions
              subActionParams={subActionParams}
              editOptionalSubAction={editOptionalSubAction}
              messageVariables={messageVariables}
              index={index}
            />
          ) : null}
          <EuiSpacer size={'m'} />
          <DisplayMoreOptions
            showingMoreOptions={showingMoreOptions}
            toggleShowingMoreOptions={toggleShowingMoreOptions}
          />
        </>
      )}
    </>
  );
};

CreateAlertComponent.displayName = 'CreateAlert';

export const CreateAlert = React.memo(CreateAlertComponent);
