/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { EuiSwitch, EuiSpacer, EuiText, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { CodeEditor, YamlLang } from '@kbn/kibana-react-plugin/public';
import { monaco } from '@kbn/monaco';
import { INPUT_CONTROL } from '../../../common/constants';
import { useStyles } from './styles';
import { useConfigModel } from './hooks/use_config_model';
import { getInputFromPolicy } from '../../common/utils';
import * as i18n from './translations';
import type { SettingsDeps } from '../../types';

const { editor } = monaco;

interface ConfigError {
  line: number;
  message: string;
}

export const ControlYamlView = ({ policy, onChange }: SettingsDeps) => {
  const styles = useStyles();
  const [errors, setErrors] = useState<ConfigError[]>([]);
  const input = getInputFromPolicy(policy, INPUT_CONTROL);
  const configuration = input?.vars?.configuration?.value || '';
  const currentModel = useConfigModel(configuration);
  const controlEnabled = !!input?.enabled;

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

      onChange({ isValid: errs.length === 0, updatedPolicy: policy });
      setErrors(errs);
    });

    return () => {
      listener.dispose();
    };
  }, [onChange, policy]);

  const onYamlChange = useCallback(
    (value) => {
      if (input?.vars) {
        input.vars.configuration.value = value;
        onChange({ isValid: errors.length === 0, updatedPolicy: policy });
      }
    },
    [errors.length, input, onChange, policy]
  );

  return (
    <EuiFlexGroup direction="column">
      {controlEnabled && (
        <EuiFlexItem>
          <EuiText color="subdued" size="s">
            {i18n.controlYamlHelp}
          </EuiText>
          <EuiSpacer size="s" />
          <div css={styles.yamlEditor}>
            <CodeEditor
              languageId={YamlLang}
              options={{
                wordWrap: 'off',
                model: currentModel,
              }}
              onChange={onYamlChange}
              value={configuration}
            />
          </div>
          <EuiSpacer size="s" />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
