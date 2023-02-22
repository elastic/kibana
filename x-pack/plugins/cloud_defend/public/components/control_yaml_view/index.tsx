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
import yaml from 'js-yaml';
import { INPUT_CONTROL } from '../../../common/constants';
import { useStyles } from './styles';
import { useConfigModel } from './hooks/use_config_model';
import { getInputFromPolicy } from '../../common/utils';
import * as i18n from './translations';
import { ControlResponseAction, ViewDeps } from '../../types';

const { editor } = monaco;

const TEXT_EDITOR_PADDING = 10;

interface ConfigError {
  line: number;
  message: string;
}

export const ControlYamlView = ({ policy, onChange, show }: ViewDeps) => {
  const styles = useStyles();
  const [errors, setErrors] = useState<ConfigError[]>([]);
  const [actionsValid, setActionsValid] = useState(true);
  const input = getInputFromPolicy(policy, INPUT_CONTROL);
  const configuration = input?.vars?.configuration?.value || '';
  const currentModel = useConfigModel(configuration);

  useEffect(() => {
    const listener = editor.onDidChangeMarkers(([resource]) => {
      const markers = editor.getModelMarkers({ resource });
      const errs = markers.map((marker) => {
        const error: ConfigError = {
          line: marker.startLineNumber,
          message: marker.message,
        };

        return error;
      });

      onChange({ isValid: actionsValid && errs.length === 0, updatedPolicy: policy });
      setErrors(errs);
    });

    return () => {
      listener.dispose();
    };
  }, [actionsValid, onChange, policy]);

  // for now we force 'alert' action on all responses. This restriction may be removed in future when we have a plan to record all responses. e.g. audit
  const validateActions = useCallback((value) => {
    try {
      const json = yaml.load(value);

      for (let i = 0; i < json.responses.length; i++) {
        const response = json.responses[i];

        if (!response.actions.includes(ControlResponseAction.alert)) {
          return false;
        }
      }
    } catch {
      // noop
    }

    return true;
  }, []);

  const onYamlChange = useCallback(
    (value) => {
      if (input?.vars) {
        input.vars.configuration.value = value;

        const areActionsValid = validateActions(value);

        setActionsValid(areActionsValid);

        onChange({ isValid: areActionsValid && errors.length === 0, updatedPolicy: policy });
      }
    },
    [errors.length, input?.vars, onChange, policy, validateActions]
  );

  return (
    <EuiFlexGroup direction="column" css={!show && styles.hide}>
      <EuiFlexItem>
        <EuiText color="subdued" size="s">
          {i18n.controlYamlHelp}
        </EuiText>
        <EuiSpacer size="s" />
        {!actionsValid && <EuiForm isInvalid={true} error={i18n.errorAlertActionRequired} />}
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
