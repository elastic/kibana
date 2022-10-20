/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { pick, isEmpty } from 'lodash';
import { JsonEditorWithMessageVariables } from '@kbn/triggers-actions-ui-plugin/public';
import { OpsgenieCreateAlertParamsSchema } from '../../../../../common';
import type { OpsgenieCreateAlertParams } from '../../../../../server/connector_types/stack';
import * as i18n from '../translations';
import { CreateAlertProps } from '.';

type JsonEditorProps = Pick<
  CreateAlertProps,
  'editAction' | 'index' | 'messageVariables' | 'subActionParams'
>;

const JsonEditorComponent: React.FC<JsonEditorProps> = ({
  editAction,
  index,
  messageVariables,
  subActionParams,
}) => {
  const [jsonEditorErrors, setJsonEditorErrors] = useState<string[]>([]);

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
    <JsonEditorWithMessageVariables
      messageVariables={messageVariables}
      paramsProperty={'subActionParams'}
      inputTargetValue={jsonEditorValue}
      aria-label={i18n.JSON_EDITOR_ARIA}
      onDocumentsChange={onAdvancedEditorChange}
      errors={jsonEditorErrors}
    />
  );
};

JsonEditorComponent.displayName = 'JsonEditor';

export const JsonEditor = React.memo(JsonEditorComponent);

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
