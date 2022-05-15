/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  EuiTabbedContent,
  EuiFormRow,
  EuiBetaBadge,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { CodeEditor } from './code_editor';
import { ScriptRecorderFields } from './script_recorder_fields';
import { ConfigKey, MonacoEditorLangId } from '../types';

enum SourceType {
  INLINE = 'syntheticsBrowserInlineConfig',
  SCRIPT_RECORDER = 'syntheticsBrowserScriptRecorderConfig',
  ZIP = 'syntheticsBrowserZipURLConfig',
}

interface SourceConfig {
  script: string;
  type: 'recorder' | 'inline';
  fileName?: string;
}

interface Props {
  onChange: (sourceConfig: SourceConfig) => void;
  onBlur: (field: ConfigKey) => void;
  value: SourceConfig;
}

export const SourceField = ({ onChange, onBlur, value }: Props) => {
  const [sourceType, setSourceType] = useState<SourceType>(
    value.type === 'inline' ? SourceType.INLINE : SourceType.SCRIPT_RECORDER
  );
  const [config, setConfig] = useState<SourceConfig>(value);

  useEffect(() => {
    onChange(config);
  }, [config, onChange]);

  const allTabs = [
    {
      id: 'syntheticsBrowserScriptRecorderConfig',
      name: (
        <EuiFlexGroup responsive={false} alignItems="center" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <FormattedMessage
              id="xpack.synthetics.createPackagePolicy.stepConfigure.browser.scriptRecorder.label"
              defaultMessage="Script recorder"
            />
          </EuiFlexItem>
          <StyledBetaBadgeWrapper grow={false}>
            <EuiBetaBadge
              label={i18n.translate(
                'xpack.synthetics.createPackagePolicy.stepConfigure.browser.scriptRecorder.experimentalLabel',
                {
                  defaultMessage: 'Tech preview',
                }
              )}
              iconType="beaker"
              tooltipContent={i18n.translate(
                'xpack.synthetics.createPackagePolicy.stepConfigure.browser.scriptRecorder.experimentalTooltip',
                {
                  defaultMessage:
                    'Preview the quickest way to create Elastic Synthetics monitoring scripts with our Elastic Synthetics Recorder',
                }
              )}
            />
          </StyledBetaBadgeWrapper>
        </EuiFlexGroup>
      ),
      'data-test-subj': 'syntheticsSourceTab__scriptRecorder',
      content: (
        <ScriptRecorderFields
          onChange={({ scriptText, fileName }) => {
            setConfig((prevConfig) => ({
              ...prevConfig,
              script: scriptText,
              type: 'recorder',
              fileName,
            }));
          }}
          script={config.script}
          fileName={config.fileName}
        />
      ),
    },
    {
      id: 'syntheticsBrowserInlineConfig',
      name: (
        <FormattedMessage
          id="xpack.synthetics.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.browser.inlineScript.label"
          defaultMessage="Inline script"
        />
      ),
      'data-test-subj': `syntheticsSourceTab__inline`,
      content: (
        <EuiFormRow
          helpText={
            <FormattedMessage
              id="xpack.synthetics.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.browser.inlineScript.helpText"
              defaultMessage="Runs Synthetic test scripts that are defined inline."
            />
          }
          fullWidth
        >
          <CodeEditor
            ariaLabel={i18n.translate(
              'xpack.synthetics.createPackagePolicy.stepConfigure.requestBody.codeEditor.javascript.ariaLabel',
              {
                defaultMessage: 'JavaScript code editor',
              }
            )}
            id="javascript"
            languageId={MonacoEditorLangId.JAVASCRIPT}
            onChange={(code) => {
              setConfig((prevConfig) => ({ ...prevConfig, script: code }));
              onBlur(ConfigKey.SOURCE_INLINE);
            }}
            value={config.script}
          />
        </EuiFormRow>
      ),
    },
  ];

  return (
    <EuiTabbedContent
      tabs={allTabs}
      initialSelectedTab={allTabs.find((tab) => tab.id === sourceType)}
      autoFocus="selected"
      onTabClick={(tab) => {
        if (tab.id !== sourceType) {
          setConfig({
            script: '',
            type: sourceType === SourceType.INLINE ? 'inline' : 'recorder',
            fileName: '',
          });
        }
        setSourceType(tab.id as SourceType);
      }}
    />
  );
};

const StyledBetaBadgeWrapper = styled(EuiFlexItem)`
  .euiToolTipAnchor {
    display: flex;
  }
`;
