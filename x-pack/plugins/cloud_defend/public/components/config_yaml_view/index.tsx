/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { CodeEditor, YamlLang } from '@kbn/kibana-react-plugin/public';
import { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import { monaco } from '@kbn/monaco';
import { ALERTS_DATASET } from '../../../common/constants';
import { useStyles } from './styles';
import { useConfigModel } from './hooks/use_config_model';

const { editor } = monaco;

interface OnChangeDeps {
  isValid: boolean;
  updatedPolicy: NewPackagePolicy;
}

interface ConfigYamlViewwDeps {
  policy: NewPackagePolicy;
  onChange(opts: OnChangeDeps): void;
}

interface ConfigError {
  line: number;
  message: string;
}

function getStreamByDataset(policy: NewPackagePolicy, name: string) {
  return policy.inputs[0].streams.find((stream) => stream.data_stream.dataset === name);
}

export const ConfigYamlView = ({ policy, onChange }: ConfigYamlViewwDeps) => {
  const styles = useStyles();
  const [errors, setErrors] = useState<ConfigError[]>([]);
  const stream = getStreamByDataset(policy, ALERTS_DATASET);
  const configuration = stream?.vars?.configuration?.value || '';
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

      onChange({ isValid: errs.length === 0, updatedPolicy: policy });
      setErrors(errs);
    });

    return () => {
      listener.dispose();
    };
  }, [onChange, policy]);

  const onYamlChange = useCallback(
    (value) => {
      if (stream?.vars) {
        stream.vars.configuration.value = value;
        onChange({ isValid: errors.length === 0, updatedPolicy: policy });
      }
    },
    [errors.length, onChange, policy, stream?.vars]
  );

  return (
    <>
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
    </>
  );
};
