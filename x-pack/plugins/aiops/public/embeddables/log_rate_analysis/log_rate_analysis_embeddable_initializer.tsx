/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { pick } from 'lodash';

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

import type { IndexPatternSelectProps } from '@kbn/unified-search-plugin/public';
import { euiThemeVars } from '@kbn/ui-theme';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';

import { DataSourceContextProvider } from '../../hooks/use_data_source';
import { LogRateAnalysisSettings } from '../../components/log_rate_analysis/log_rate_analysis_for_embeddable/embeddable_menu';

import type { LogRateAnalysisEmbeddableRuntimeState } from './types';

export interface LogRateAnalysisEmbeddableInitializerProps {
  dataViews: DataViewsPublicPluginStart;
  IndexPatternSelect: React.ComponentType<IndexPatternSelectProps>;
  initialInput?: Partial<LogRateAnalysisEmbeddableRuntimeState>;
  onCreate: (props: LogRateAnalysisEmbeddableRuntimeState) => void;
  onCancel: () => void;
  onPreview: (update: LogRateAnalysisEmbeddableRuntimeState) => Promise<void>;
  isNewPanel: boolean;
}

export const LogRateAnalysisEmbeddableInitializer: FC<
  LogRateAnalysisEmbeddableInitializerProps
> = ({
  dataViews,
  IndexPatternSelect,
  initialInput,
  onCreate,
  onCancel,
  onPreview,
  isNewPanel,
}) => {
  const [formInput, setFormInput] = useState<LogRateAnalysisEmbeddableRuntimeState>(
    pick(initialInput ?? {}, ['dataViewId']) as LogRateAnalysisEmbeddableRuntimeState
  );
  const [isFormValid, setIsFormValid] = useState(true);

  const updatedProps = useMemo(() => {
    return {
      ...formInput,
      title: isPopulatedObject(formInput)
        ? i18n.translate('xpack.aiops.embeddableLogRateAnalysis.attachmentTitle', {
            defaultMessage: 'Log rate analysis',
          })
        : '',
    };
  }, [formInput]);

  useEffect(
    function previewChanges() {
      if (isFormValid) {
        onPreview(updatedProps);
      }
    },
    [isFormValid, onPreview, updatedProps]
  );

  const setDataViewId = useCallback(
    (dataViewId: string | undefined) => {
      setFormInput({
        ...formInput,
        dataViewId: dataViewId ?? '',
      });
      setIsFormValid(false);
    },
    [formInput]
  );

  return (
    <>
      <EuiFlyoutHeader
        hasBorder={true}
        css={{
          pointerEvents: 'auto',
          backgroundColor: euiThemeVars.euiColorEmptyShade,
        }}
      >
        <EuiTitle size="s" data-test-subj="inlineEditingFlyoutLabel">
          <h2>
            {isNewPanel
              ? i18n.translate('xpack.aiops.embeddableLogRateAnalysis.config.title.new', {
                  defaultMessage: 'Create log rate analysis',
                })
              : i18n.translate('xpack.aiops.embeddableLogRateAnalysis.config.title.edit', {
                  defaultMessage: 'Edit log rate analysis',
                })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiForm>
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.aiops.embeddableLogRateAnalysis.config.dataViewLabel', {
              defaultMessage: 'Data view',
            })}
          >
            <IndexPatternSelect
              autoFocus={!formInput.dataViewId}
              fullWidth
              compressed
              indexPatternId={formInput.dataViewId}
              placeholder={i18n.translate(
                'xpack.aiops.embeddableLogRateAnalysis.config.dataViewSelectorPlaceholder',
                {
                  defaultMessage: 'Select data view',
                }
              )}
              onChange={(newId) => {
                setDataViewId(newId ?? '');
              }}
            />
          </EuiFormRow>
          <DataSourceContextProvider dataViews={dataViews} dataViewId={formInput.dataViewId}>
            <EuiSpacer />

            <FormControls
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
            <EuiButtonEmpty
              color="primary"
              size="m"
              onClick={onCancel}
              data-test-subj="aiopsLogRateAnalysisCancelButton"
            >
              <FormattedMessage
                id="xpack.aiops.embeddableLogRateAnalysis.config.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={onCreate.bind(null, updatedProps)}
              fill
              aria-label={i18n.translate(
                'xpack.aiops.embeddableLogRateAnalysis.config.applyFlyoutAriaLabel',
                {
                  defaultMessage: 'Apply changes',
                }
              )}
              isDisabled={!isFormValid}
              iconType="check"
              data-test-subj="aiopsLogRateAnalysisConfirmButton"
            >
              <FormattedMessage
                id="xpack.aiops.embeddableLogRateAnalysis.config.applyAndCloseLabel"
                defaultMessage="Apply and close"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};

export const FormControls: FC<{
  formInput: LogRateAnalysisEmbeddableRuntimeState;
  onChange: (update: LogRateAnalysisEmbeddableRuntimeState) => void;
  onValidationChange: (isValid: boolean) => void;
}> = ({ formInput, onChange, onValidationChange }) => {
  useEffect(
    function validateForm() {
      onValidationChange(formInput.dataViewId !== undefined);
    },
    [formInput, onValidationChange]
  );

  useEffect(
    function samplerChange() {
      onChange({
        ...formInput,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onChange]
  );

  useEffect(
    function samplerChange() {
      onChange({
        ...formInput,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onChange]
  );

  return (
    <>
      <LogRateAnalysisSettings compressed={true} />
    </>
  );
};
