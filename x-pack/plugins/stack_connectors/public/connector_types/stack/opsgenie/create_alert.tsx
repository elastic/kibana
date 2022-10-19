/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { pick, isEmpty } from 'lodash';
import {
  ActionParamsProps,
  JsonEditorWithMessageVariables,
  TextAreaWithMessageVariables,
  TextFieldWithMessageVariables,
} from '@kbn/triggers-actions-ui-plugin/public';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import { OpsgenieCreateAlertParamsSchema } from '../../../../common';
import type {
  OpsgenieActionParams,
  OpsgenieCreateAlertParams,
} from '../../../../server/connector_types/stack';
import * as i18n from './translations';
import { EditActionCallback } from './types';
import { Tags } from './tags';

type CreateAlertProps = Omit<ActionParamsProps<OpsgenieActionParams>, 'actionParams'> & {
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

  const [jsonEditorErrors, setJsonEditorErrors] = useState<string[]>([]);

  const toggleShowJsonEditor = useCallback((event) => setShowJsonEditor(event.target.checked), []);
  const toggleShowingMoreOptions = useCallback(
    () => setShowingMoreOptions((previousState) => !previousState),
    []
  );

  const isMessageInvalid =
    errors['subActionParams.message'] !== undefined &&
    errors['subActionParams.message'].length > 0 &&
    subActionParams?.message !== undefined;

  const jsonEditorValue = useMemo(() => getJsonEditorValue(subActionParams), [subActionParams]);

  const validateJsonWithSchema = useCallback((jsonBlob: unknown) => {
    try {
      OpsgenieCreateAlertParamsSchema.validate(jsonBlob);
      setJsonEditorErrors([]);
      return true;
    } catch (error) {
      setJsonEditorErrors([error.message]);
      return false;
    }
  }, []);

  const onAdvancedEditorChange = useCallback(
    (json: string) => {
      const parsedJson = parseJson(json);
      if (!parsedJson) {
        return;
      }

      if (!validateJsonWithSchema(parsedJson)) {
        return;
      }

      const sanitizedSubActionParams = getSanitizedSubActionParams(parsedJson, subActionParams);
      editAction('subActionParams', sanitizedSubActionParams, index);
    },
    [editAction, index, subActionParams, validateJsonWithSchema]
  );

  useEffect(() => {
    // show the initial error messages
    validateJsonWithSchema(subActionParams);
  }, [subActionParams, validateJsonWithSchema]);

  return (
    <>
      <EuiSpacer size={'m'} />
      <EuiSwitch
        label={i18n.USE_JSON_EDITOR_LABEL}
        checked={showJsonEditor}
        onChange={toggleShowJsonEditor}
      />
      <EuiSpacer size={'m'} />
      {showJsonEditor ? (
        <JsonEditorWithMessageVariables
          messageVariables={messageVariables}
          paramsProperty={'subActionParams'}
          inputTargetValue={jsonEditorValue}
          aria-label={i18n.JSON_EDITOR_ARIA}
          onDocumentsChange={onAdvancedEditorChange}
          errors={jsonEditorErrors}
        />
      ) : (
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
          {showingMoreOptions ? (
            <>
              <EuiSpacer size={'m'} />
              <Tags values={subActionParams?.tags ?? []} onChange={editOptionalSubAction} />
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
              <EuiFormRow
                data-test-subj="opsgenie-user-row"
                fullWidth
                label={i18n.USER_FIELD_LABEL}
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
              />
            </>
          ) : null}
          <EuiSpacer size={'m'} />
          <EuiButtonEmpty
            color="primary"
            iconSide="right"
            iconType={showingMoreOptions ? 'arrowUp' : 'arrowDown'}
            flush={'left'}
            onClick={toggleShowingMoreOptions}
          >
            {showingMoreOptions ? i18n.HIDE_OPTIONS : i18n.MORE_OPTIONS}
          </EuiButtonEmpty>
        </>
      )}
    </>
  );
};

CreateAlertComponent.displayName = 'CreateAlert';

export const CreateAlert = React.memo(CreateAlertComponent);

const parseJson = (jsonValue: string): Record<string, unknown> | undefined => {
  try {
    return JSON.parse(jsonValue);
  } catch (error) {
    return;
  }
};

const getJsonEditorValue = (subActionParams?: Partial<OpsgenieCreateAlertParams>) => {
  const defaultValue = '{}';
  try {
    const value = JSON.stringify(subActionParams, null, 2);
    if (isEmpty(value)) {
      return defaultValue;
    }
    return value;
  } catch (error) {
    return defaultValue;
  }
};

const getSchemaKeys = () => {
  const structure = OpsgenieCreateAlertParamsSchema.getSchemaStructure();

  const schemaKeys: string[] = [];

  for (const entry of structure) {
    if (entry.path.length > 0) {
      schemaKeys.push(entry.path[0]);
    }
  }

  return schemaKeys;
};

const getSanitizedSubActionParams = (
  parsedJson: Record<string, unknown>,
  subActionParams?: Partial<OpsgenieCreateAlertParams>
) => {
  const validKeys = getSchemaKeys();
  const sanitizedEditorFields = pick(parsedJson, validKeys);
  // TODO: do I need this?
  const sanitizedSubActionParams = pick(subActionParams, validKeys);
  return {
    ...sanitizedSubActionParams,
    ...sanitizedEditorFields,
  };
};
