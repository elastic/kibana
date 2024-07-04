/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
} from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import { i18n } from '@kbn/i18n';
import type { FC } from 'react';
import React, { useEffect, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { pick } from 'lodash';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import useObservable from 'react-use/lib/useObservable';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import { DataSourceContextProvider } from '../../hooks/use_data_source';
import type { PatternAnalysisEmbeddableRuntimeState } from './types';
import { PatternAnalysisSettings } from '../../components/log_categorization/log_categorization_for_embeddable/embeddable_menu';
import { RandomSampler } from '../../components/log_categorization/sampling_menu';
import {
  DEFAULT_PROBABILITY,
  RANDOM_SAMPLER_OPTION,
} from '../../components/log_categorization/sampling_menu/random_sampler';
import type { MinimumTimeRangeOption } from '../../components/log_categorization/log_categorization_for_embeddable/minimum_time_range';
import { getMessageField } from '../../components/log_categorization/utils';
import { FieldSelector } from '../../components/log_categorization/log_categorization_for_embeddable/field_selector';
import { SamplingPanel } from '../../components/log_categorization/sampling_menu/sampling_panel';

export interface PatternAnalysisInitializerProps {
  initialInput?: Partial<PatternAnalysisEmbeddableRuntimeState>;
  onCreate: (props: PatternAnalysisEmbeddableRuntimeState) => void;
  onCancel: () => void;
  isNewPanel: boolean;
}

export const PatternAnalysisEmbeddableInitializer: FC<PatternAnalysisInitializerProps> = ({
  initialInput,
  onCreate,
  onCancel,
  isNewPanel,
}) => {
  const {
    unifiedSearch: {
      ui: { IndexPatternSelect },
    },
  } = useAiopsAppContext();

  const [dataViewId, setDataViewId] = useState(initialInput?.dataViewId ?? '');

  const [formInput, setFormInput] = useState<FormControlsProps>(
    pick(
      initialInput ?? {
        minimumTimeRangeOption: '1 week',
        randomSamplerMode: RANDOM_SAMPLER_OPTION.ON_AUTOMATIC,
        randomSamplerProbability: DEFAULT_PROBABILITY,
      },
      ['fieldName', 'minimumTimeRangeOption', 'randomSamplerMode', 'randomSamplerProbability']
    ) as FormControlsProps
  );
  const [isFormValid, setIsFormValid] = useState(true);

  const updatedProps = useMemo(() => {
    return {
      ...formInput,
      title: isPopulatedObject(formInput)
        ? i18n.translate('xpack.aiops.embeddablePatternAnalysis.attachmentTitle', {
            defaultMessage: 'Pattern analysis: {fieldName}',
            values: {
              fieldName: formInput.fieldName,
            },
          })
        : '',
      dataViewId,
    };
  }, [formInput, dataViewId]);

  return (
    <>
      <EuiFlyoutHeader
        hasBorder={true}
        css={{
          pointerEvents: 'auto',
          backgroundColor: euiThemeVars.euiColorEmptyShade,
        }}
      >
        <EuiTitle size="xs" data-test-subj="inlineEditingFlyoutLabel">
          <h2>
            {isNewPanel
              ? i18n.translate('xpack.aiops.embeddablePatternAnalysis.config.title.new', {
                  defaultMessage: 'Create pattern analysis',
                })
              : i18n.translate('xpack.aiops.embeddablePatternAnalysis.config.title.edit', {
                  defaultMessage: 'Edit pattern analysis',
                })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiForm>
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.aiops.embeddablePatternAnalysis.config.dataViewLabel', {
              defaultMessage: 'Data view',
            })}
          >
            <IndexPatternSelect
              autoFocus={!dataViewId}
              fullWidth
              compressed
              indexPatternId={dataViewId}
              placeholder={i18n.translate(
                'xpack.aiops.embeddablePatternAnalysis.config.dataViewSelectorPlaceholder',
                {
                  defaultMessage: 'Select data view',
                }
              )}
              onChange={(newId) => {
                setDataViewId(newId ?? '');
              }}
            />
          </EuiFormRow>
          <DataSourceContextProvider dataViewId={dataViewId}>
            <EuiSpacer />

            <FormControls
              dataViewId={dataViewId}
              formInput={formInput}
              onChange={setFormInput}
              onValidationChange={setIsFormValid}
            />
          </DataSourceContextProvider>
        </EuiForm>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onCancel} data-test-subj="aiopsPatternAnalysisCancelButton">
              <FormattedMessage
                id="xpack.aiops.embeddablePatternAnalysis.config.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={onCreate.bind(null, updatedProps)}
              fill
              aria-label={i18n.translate(
                'xpack.aiops.embeddablePatternAnalysis.config.applyFlyoutAriaLabel',
                {
                  defaultMessage: 'Apply changes',
                }
              )}
              isDisabled={!isFormValid || !dataViewId}
              iconType="check"
              data-test-subj="aiopsPatternAnalysisConfirmButton"
            >
              <FormattedMessage
                id="xpack.aiops.embeddablePatternAnalysis.config.applyAndCloseLabel"
                defaultMessage="Apply and close"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};

export type FormControlsProps = Pick<
  PatternAnalysisEmbeddableRuntimeState,
  'fieldName' | 'minimumTimeRangeOption' | 'randomSamplerMode' | 'randomSamplerProbability'
>;

export const FormControls: FC<{
  dataViewId: string;
  formInput: FormControlsProps;
  onChange: (update: FormControlsProps) => void;
  onValidationChange: (isValid: boolean) => void;
}> = ({ dataViewId, formInput, onChange, onValidationChange }) => {
  const {
    data: { dataViews },
  } = useAiopsAppContext();
  const [fields, setFields] = useState<DataViewField[]>([]);
  const [selectedField, setSelectedField] = useState<DataViewField | null>(null);

  const randomSampler = useMemo(() => {
    return new RandomSampler({
      randomSamplerMode: formInput.randomSamplerMode ?? RANDOM_SAMPLER_OPTION.ON_AUTOMATIC,
      setRandomSamplerMode: () => {},
      randomSamplerProbability: formInput.randomSamplerProbability ?? DEFAULT_PROBABILITY,
      setRandomSamplerProbability: () => {},
    });
  }, [formInput.randomSamplerMode, formInput.randomSamplerProbability]);
  const randomSamplerMode = useObservable(randomSampler.getMode$(), randomSampler.getMode());
  const randomSamplerProbability = useObservable(
    randomSampler.getProbability$(),
    randomSampler.getProbability()
  );

  useEffect(
    function initFields() {
      dataViews.get(dataViewId).then((dataView) => {
        const { dataViewFields, messageField } = getMessageField(dataView);
        setFields(dataViewFields);
        if (formInput.fieldName !== undefined) {
          const field = dataViewFields.find((f) => f.name === formInput.fieldName);
          if (field !== undefined) {
            setSelectedField(field);
          }
        } else if (messageField !== null) {
          setSelectedField(messageField);
        }
      });
    },
    [dataViewId, dataViews, formInput, onChange]
  );

  useEffect(
    function samplerChange() {
      onChange({
        ...formInput,
        randomSamplerMode,
        randomSamplerProbability,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onChange, randomSamplerMode, randomSamplerProbability]
  );

  useEffect(
    function samplerChange() {
      if (selectedField === null) {
        return;
      }

      onChange({
        ...formInput,
        fieldName: selectedField.name,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onChange, selectedField]
  );

  const setMinimumTimeRangeOption = (option: MinimumTimeRangeOption) => {
    onChange({
      ...formInput,
      minimumTimeRangeOption: option,
    });
  };

  return (
    <>
      <FieldSelector
        fields={fields}
        selectedField={selectedField}
        setSelectedField={setSelectedField}
      />

      <EuiSpacer />

      <PatternAnalysisSettings
        categoryCount={undefined}
        minimumTimeRangeOption={formInput.minimumTimeRangeOption}
        setMinimumTimeRangeOption={setMinimumTimeRangeOption}
      />

      <EuiSpacer />

      <SamplingPanel
        randomSampler={randomSampler}
        reload={() => {}}
        calloutPosition="bottom"
        displayProbability={false}
      />
    </>
  );
};
