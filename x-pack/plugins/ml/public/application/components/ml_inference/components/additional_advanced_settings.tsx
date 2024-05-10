/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState, memo, useMemo } from 'react';

import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFieldText,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiPanel,
  EuiTextArea,
  htmlIdGenerator,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AdditionalSettings, MlInferenceState } from '../types';
import { SaveChangesButton } from './save_changes_button';
import { useMlKibana } from '../../../contexts/kibana';

interface Props {
  condition?: string;
  tag?: string;
  handleAdvancedConfigUpdate: (configUpdate: Partial<MlInferenceState>) => void;
}

export const AdditionalAdvancedSettings: FC<Props> = memo(
  ({ handleAdvancedConfigUpdate, condition, tag }) => {
    const [additionalSettings, setAdditionalSettings] = useState<
      Partial<AdditionalSettings> | undefined
    >(condition || tag ? { condition, tag } : undefined);

    const {
      services: {
        docLinks: { links },
      },
    } = useMlKibana();

    const handleAdditionalSettingsChange = (settingsChange: Partial<AdditionalSettings>) => {
      setAdditionalSettings({ ...additionalSettings, ...settingsChange });
    };

    const accordionId = useMemo(() => htmlIdGenerator()(), []);
    const additionalSettingsUpdated = useMemo(
      () => additionalSettings?.tag !== tag || additionalSettings?.condition !== condition,
      [additionalSettings, tag, condition]
    );

    const updateAdditionalSettings = () => {
      handleAdvancedConfigUpdate({ ...additionalSettings });
    };

    return (
      <EuiAccordion
        data-test-subj="mlTrainedModelsInferenceAdvancedSettingsAccordion"
        id={accordionId}
        buttonContent={
          <EuiFlexGroup gutterSize="xs">
            <EuiFlexItem
              grow={false}
              data-test-subj="mlTrainedModelsInferenceAdvancedSettingsAccordionButton"
            >
              <FormattedMessage
                id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.advanced.additionalSettingsLabel"
                defaultMessage="Additional settings"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {additionalSettingsUpdated ? (
                <SaveChangesButton
                  onClick={updateAdditionalSettings}
                  disabled={additionalSettings === undefined}
                />
              ) : null}
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      >
        <EuiPanel color="subdued">
          <EuiFlexGroup>
            {/* CONDITION */}
            <EuiFlexItem>
              <EuiFormRow
                fullWidth
                label={
                  <FormattedMessage
                    id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.advanced.conditionLabel"
                    defaultMessage="Condition (optional)"
                  />
                }
                helpText={
                  <FormattedMessage
                    id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.advanced.conditionHelpText"
                    defaultMessage="This condition must be written as a {painlessDocs} script. If provided, this inference processor only runs when condition is true."
                    values={{
                      painlessDocs: (
                        <EuiLink
                          external
                          target="_blank"
                          href={links.scriptedFields.painlessWalkthrough}
                        >
                          Painless
                        </EuiLink>
                      ),
                    }}
                  />
                }
              >
                <EuiTextArea
                  data-test-subj="mlTrainedModelsInferenceAdvancedSettingsConditionTextArea"
                  aria-label={i18n.translate(
                    'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.advanced.conditionAriaLabel',
                    { defaultMessage: 'Optional condition for running the processor' }
                  )}
                  value={additionalSettings?.condition ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    handleAdditionalSettingsChange({ condition: e.target.value })
                  }
                />
              </EuiFormRow>
            </EuiFlexItem>
            {/* TAG */}
            <EuiFlexItem>
              <EuiFlexGroup direction="column">
                <EuiFlexItem>
                  <EuiFormRow
                    fullWidth
                    label={
                      <FormattedMessage
                        id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.advanced.TagLabel"
                        defaultMessage="Tag (optional)"
                      />
                    }
                    helpText={
                      <FormattedMessage
                        id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.advanced.tagHelpText"
                        defaultMessage="Identifier for the processor. Useful for debugging and metrics."
                      />
                    }
                  >
                    <EuiFieldText
                      data-test-subj="mlTrainedModelsInferenceAdvancedSettingsTagInput"
                      value={additionalSettings?.tag ?? ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleAdditionalSettingsChange({ tag: e.target.value })
                      }
                      aria-label={i18n.translate(
                        'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.advanced.tagAriaLabel',
                        { defaultMessage: 'Optional tag identifier for the processor' }
                      )}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiAccordion>
    );
  }
);
