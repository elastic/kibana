/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import {
  EuiFlyout,
  EuiTitle,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiForm,
  EuiPanel,
  EuiFormRow,
  EuiCodeEditor,
  EuiFieldText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { sendPostOutput } from '../../../../hooks';

import { HostsInput } from './hosts_input';

interface Props {
  onClose: () => void;
}
export const AddOutputFlyout: React.FunctionComponent<Props> = ({ onClose }) => {
  const [name, setName] = useState<string>('');
  const [hosts, setHosts] = useState<string[]>([]);
  const [yamlConfig, setYamlConfig] = useState<string>('');

  const onSubmit = useCallback(() => {
    async function submit() {
      await sendPostOutput({
        name,
        type: 'elasticsearch',
        hosts,
        config_yaml: yamlConfig,
      });
      onClose();
    }

    submit();
  }, [name, hosts, yamlConfig, onClose]);

  return (
    <EuiFlyout ownFocus onClose={onClose} hideCloseButton aria-labelledby="flyoutComplicatedTitle">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="flyoutComplicatedTitle">Add an output</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiSpacer size="m" />
        <EuiSpacer />
        <EuiForm onSubmit={onSubmit}>
          <EuiPanel hasShadow={false} hasBorder={true}>
            <EuiFormRow
              label={i18n.translate('xpack.fleet.outputForm.nameLabel', {
                defaultMessage: 'Name',
              })}
              fullWidth
            >
              <EuiFieldText
                fullWidth
                compressed
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                }}
              />
            </EuiFormRow>
            <HostsInput
              helpText=""
              id="fleet-outputs-hosts-input"
              label="Elasticsearch hosts"
              onChange={setHosts}
              value={hosts}
            />
            <EuiSpacer />
            <EuiFormRow
              label={i18n.translate('xpack.fleet.settings.additionalYamlConfig', {
                defaultMessage: 'Elasticsearch output configuration (YAML)',
              })}
              fullWidth
            >
              <EuiCodeEditor
                width="100%"
                mode="yaml"
                theme="textmate"
                placeholder="# YAML settings here will be added to the Elasticsearch output section of each policy"
                setOptions={{
                  minLines: 10,
                  maxLines: 30,
                  tabSize: 2,
                  showGutter: false,
                  showPrintMargin: false,
                }}
                value={yamlConfig}
                onChange={(val) => {
                  setYamlConfig(val);
                }}
              />
            </EuiFormRow>
          </EuiPanel>
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
              Close
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={onSubmit} fill>
              Save
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
