/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { EuiSwitch, EuiSpacer, EuiText, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { CodeEditor, YamlLang } from '@kbn/kibana-react-plugin/public';
import { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import { monaco } from '@kbn/monaco';
import { INPUT_CONTROL } from '../../../common/constants';
import { useStyles } from './styles';
import { useConfigModel } from './hooks/use_config_model';
import { getInputFromPolicy } from '../../common/utils';
import * as i18n from './translations';

const { editor } = monaco;

interface OnChangeDeps {
  isValid: boolean;
  updatedPolicy: NewPackagePolicy;
}

interface ConfigYamlViewDeps {
  policy: NewPackagePolicy;
  onChange(opts: OnChangeDeps): void;
}

interface ConfigError {
  line: number;
  message: string;
}

export const ConfigYamlView = ({ policy, onChange }: ConfigYamlViewDeps) => {
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

  const onToggleEnabled = useCallback(
    (e) => {
      if (input) {
        input.enabled = e.target.checked;
        onChange({ isValid: errors.length === 0, updatedPolicy: policy });
      }
    },
    [errors.length, input, onChange, policy]
  );

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiSwitch
          data-test-subj="cloud-defend-control-toggle"
          label={i18n.enableControl}
          checked={controlEnabled}
          onChange={onToggleEnabled}
        />
        <EuiSpacer size="s" />
        <EuiText color="subdued" size="s">
          {i18n.enableControlHelp}
        </EuiText>
      </EuiFlexItem>
      {controlEnabled && (
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h4>{i18n.controlYaml}</h4>
          </EuiTitle>
          <EuiSpacer size="s" />
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
