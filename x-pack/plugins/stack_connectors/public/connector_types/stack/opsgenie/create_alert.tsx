/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { keys, pick, omit, intersection } from 'lodash';
import {
  ActionParamsProps,
  JsonEditorWithMessageVariables,
  TextAreaWithMessageVariables,
  TextFieldWithMessageVariables,
} from '@kbn/triggers-actions-ui-plugin/public';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  RecursivePartial,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type {
  OpsgenieActionParams,
  OpsgenieCreateAlertParams,
} from '../../../../server/connector_types/stack';
import * as i18n from './translations';
import { EditActionCallback } from './types';
import { Tags } from './tags';

type CreateAlertProps = Omit<ActionParamsProps<OpsgenieActionParams>, 'actionParams'> & {
  subActionParams?: RecursivePartial<OpsgenieCreateAlertParams>;
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
  const isMessageInvalid =
    errors['subActionParams.message'] !== undefined &&
    errors['subActionParams.message'].length > 0 &&
    subActionParams?.message !== undefined;

  const accordionId = useGeneratedHtmlId({ prefix: `createAlertEditor-${index}` });
  const advancedEditorValue = getAdvancedEditorValue(subActionParams);

  const onAdvancedEditorChange = useCallback(
    (json: string) => {
      const parsedJson = parseJson(json);
      if (!parsedJson) {
        return;
      }

      const prohibitedKeys = getInvalidKeys(parsedJson);
      if (prohibitedKeys.length > 0) {
        editSubAction('advancedEditor', prohibitedKeys);
        return;
      }

      const sanitizedSubActionParams = getSanitizedSubActionParams(parsedJson, subActionParams);
      editAction('subActionParams', sanitizedSubActionParams, index);
    },
    [editAction, editSubAction, index, subActionParams]
  );

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
      <EuiSpacer size={'m'} />
      <EuiAccordion
        id={accordionId}
        buttonContent={i18n.ADVANCED_OPTIONS}
        paddingSize={'none'}
        arrowDisplay={'right'}
      >
        <EuiSpacer size={'m'} />
        <Tags onChange={editOptionalSubAction} />
        <EuiSpacer size={'m'} />
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow
              data-test-subj="opsgenie-entity-row"
              fullWidth
              label={i18n.ENTITY_FIELD_LABEL}
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
        <EuiFormRow data-test-subj="opsgenie-user-row" fullWidth label={i18n.USER_FIELD_LABEL}>
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
        />
        <JsonEditorWithMessageVariables
          messageVariables={messageVariables}
          paramsProperty={'subActionParams'}
          inputTargetValue={advancedEditorValue}
          label={i18n.ADVANCED_JSON_LABEL}
          aria-label={i18n.ADVANCED_JSON_ARIA}
          onDocumentsChange={onAdvancedEditorChange}
          errors={errors['subActionParams.advancedEditor'] as string[]}
        />
      </EuiAccordion>
    </>
  );
};

CreateAlertComponent.displayName = 'CreateAlert';

export const CreateAlert = React.memo(CreateAlertComponent);

const ignoredSubActionFields = [
  'message',
  'alias',
  'description',
  'entity',
  'source',
  'user',
  'note',
  'tags',
];

const parseJson = (jsonValue: string): Record<string, unknown> | undefined => {
  try {
    return JSON.parse(jsonValue);
  } catch (error) {
    return;
  }
};

const getAdvancedEditorValue = (subActionParams?: RecursivePartial<OpsgenieCreateAlertParams>) => {
  try {
    return JSON.stringify(omit(subActionParams, ignoredSubActionFields), null, 2);
  } catch (error) {
    return '';
  }
};

const getInvalidKeys = (parsedJson: Record<string, unknown>) => {
  const prohibitedKeys = [...ignoredSubActionFields, '__proto__'];
  const parsedJsonKeys = keys(parsedJson);
  return intersection(parsedJsonKeys, prohibitedKeys);
};

const getSanitizedSubActionParams = (
  parsedJson: Record<string, unknown>,
  subActionParams?: RecursivePartial<OpsgenieCreateAlertParams>
) => {
  const sanitizedObj = omit(parsedJson, ['advancedEditor', ...ignoredSubActionFields]);
  const textFields = pick(subActionParams, ...ignoredSubActionFields);
  return {
    ...textFields,
    ...sanitizedObj,
  };
};
