/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { EuiSpacer, EuiText, EuiFlexGroup, EuiFlexItem, EuiForm } from '@elastic/eui';
import { CodeEditor, YamlLang } from '@kbn/kibana-react-plugin/public';
import { monaco } from '@kbn/monaco';
import { uniq } from 'lodash';
import { INPUT_CONTROL } from '../../../common/constants';
import { useStyles } from './styles';
import { useConfigModel } from './hooks/use_config_model';
import {
  getInputFromPolicy,
  validateStringValuesForCondition,
  getSelectorsAndResponsesFromYaml,
  validateMaxSelectorsAndResponses,
} from '../../common/utils';
import * as i18n from './translations';
import { ViewDeps, SelectorConditionsMap, SelectorCondition } from '../../types';

const { editor } = monaco;

const TEXT_EDITOR_PADDING = 10;

interface EditorError {
  line: number;
  message: string;
}

export const ControlYamlView = ({ policy, onChange, show }: ViewDeps) => {
  const styles = useStyles();
  const [editorErrors, setEditorErrors] = useState<EditorError[]>([]);
  const [additionalErrors, setAdditionalErrors] = useState<string[]>([]);
  const input = getInputFromPolicy(policy, INPUT_CONTROL);
  const configuration = input?.vars?.configuration?.value || '';
  const currentModel = useConfigModel(configuration);

  // not all validations can be done via json-schema
  const validateAdditional = useCallback((value) => {
    const errors: string[] = [];

    const { selectors, responses } = getSelectorsAndResponsesFromYaml(value);

    errors.push(...validateMaxSelectorsAndResponses(selectors, responses));

    // validate selectors
    selectors.forEach((selector) => {
      Object.keys(selector).map((prop) => {
        const condition = prop as SelectorCondition;

        if (SelectorConditionsMap[condition]?.type === 'stringArray') {
          const values = selector[condition] as string[];
          errors.push(...validateStringValuesForCondition(condition, values));
        }
      });
    });

    // validate responses
    responses.forEach((response) => {
      // for now we force 'alert' action if 'block' action added.
      if (
        response.actions &&
        response.actions.includes('block') &&
        !response.actions.includes('alert')
      ) {
        errors.push(i18n.errorAlertActionRequired);
      }
    });

    return uniq(errors);
  }, []);

  useEffect(() => {
    // for on mount
    const otherErrors = validateAdditional(configuration);
    if (otherErrors.length !== additionalErrors.length) {
      setAdditionalErrors(otherErrors);
    }

    const listener = editor.onDidChangeMarkers(([resource]) => {
      const markers = editor.getModelMarkers({ resource });
      const errs = markers.map((marker) => {
        const error: EditorError = {
          line: marker.startLineNumber,
          message: marker.message,
        };

        return error;
      });

      // prevents infinite loop
      if (
        otherErrors.length !== additionalErrors.length ||
        JSON.stringify(errs) !== JSON.stringify(editorErrors)
      ) {
        onChange({
          isValid: otherErrors.length === 0 && errs.length === 0,
          updatedPolicy: policy,
        });
        setEditorErrors(errs);
      }
    });

    return () => {
      listener.dispose();
    };
  }, [editorErrors, onChange, policy, additionalErrors.length, validateAdditional, configuration]);

  const onYamlChange = useCallback(
    (value) => {
      if (input?.vars) {
        input.vars.configuration.value = value;

        const errs = validateAdditional(value);
        setAdditionalErrors(errs);

        onChange({
          isValid: errs.length === 0 && editorErrors.length === 0,
          updatedPolicy: policy,
        });
      }
    },
    [editorErrors.length, input?.vars, onChange, policy, validateAdditional]
  );

  return (
    <EuiFlexGroup direction="column" css={!show && styles.hide}>
      <EuiFlexItem>
        <EuiText color="subdued" size="s">
          {i18n.controlYamlHelp}
        </EuiText>
        <EuiSpacer size="s" />
        {additionalErrors.length > 0 && (
          <EuiForm
            data-test-subj="cloudDefendAdditionalErrors"
            isInvalid={true}
            error={additionalErrors}
          />
        )}
        <div css={styles.yamlEditor}>
          <CodeEditor
            width="100%"
            languageId={YamlLang}
            options={{
              wordWrap: 'off',
              model: currentModel,
              automaticLayout: true,
              padding: { top: TEXT_EDITOR_PADDING, bottom: TEXT_EDITOR_PADDING },
            }}
            onChange={onYamlChange}
            value={configuration}
          />
        </div>
        <EuiSpacer size="s" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
