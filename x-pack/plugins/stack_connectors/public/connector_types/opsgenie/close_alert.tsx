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
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  RecursivePartial,
} from '@elastic/eui';
import type {
  OpsgenieActionParams,
  OpsgenieCloseAlertParams,
} from '../../../server/connector_types';
import * as i18n from './translations';
import { EditActionCallback } from './types';
import { DisplayMoreOptions } from './display_more_options';

type AdditionalOptionsProps = Pick<
  CloseAlertProps,
  'subActionParams' | 'editOptionalSubAction' | 'index' | 'messageVariables'
>;

const AdditionalOptions: React.FC<AdditionalOptionsProps> = ({
  subActionParams,
  editOptionalSubAction,
  index,
  messageVariables,
}) => {
  return (
    <>
      <EuiSpacer size={'m'} />
      <EuiFlexGroup>
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
        <EuiFlexItem>
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
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

AdditionalOptions.displayName = 'AdditionalOptions';

type CloseAlertProps = Pick<
  ActionParamsProps<OpsgenieActionParams>,
  'errors' | 'index' | 'messageVariables'
> & {
  subActionParams?: RecursivePartial<OpsgenieCloseAlertParams>;
  editSubAction: EditActionCallback;
  editOptionalSubAction: EditActionCallback;
  showSaveError: boolean;
};

const CloseAlertComponent: React.FC<CloseAlertProps> = ({
  editSubAction,
  editOptionalSubAction,
  errors,
  index,
  messageVariables,
  subActionParams,
  showSaveError,
}) => {
  const isAliasInvalid =
    (errors['subActionParams.alias'] !== undefined &&
      Number(errors['subActionParams.alias'].length) > 0 &&
      subActionParams?.alias !== undefined) ||
    showSaveError;

  const [showingMoreOptions, setShowingMoreOptions] = useState<boolean>(false);
  const toggleShowingMoreOptions = useCallback(
    () => setShowingMoreOptions((previousState) => !previousState),
    []
  );

  return (
    <>
      <EuiFormRow
        data-test-subj="opsgenie-alias-row"
        fullWidth
        error={errors['subActionParams.alias']}
        isInvalid={isAliasInvalid}
        label={i18n.ALIAS_FIELD_LABEL}
        helpText={i18n.OPSGENIE_ALIAS_HELP}
        labelAppend={
          <EuiText size="xs" color="subdued">
            {i18n.REQUIRED_LABEL}
          </EuiText>
        }
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

      {showingMoreOptions ? (
        <AdditionalOptions
          subActionParams={subActionParams}
          index={index}
          messageVariables={messageVariables}
          editOptionalSubAction={editOptionalSubAction}
        />
      ) : null}
      <EuiSpacer size={'m'} />
      <DisplayMoreOptions
        showingMoreOptions={showingMoreOptions}
        toggleShowingMoreOptions={toggleShowingMoreOptions}
      />
    </>
  );
};

CloseAlertComponent.displayName = 'CloseAlert';

export const CloseAlert = React.memo(CloseAlertComponent);
