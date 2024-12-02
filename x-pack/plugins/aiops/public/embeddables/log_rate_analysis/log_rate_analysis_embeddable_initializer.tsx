/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { pick } from 'lodash';
import useMountedState from 'react-use/lib/useMountedState';

import {
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiForm,
  EuiFormRow,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
  EuiSpacer,
} from '@elastic/eui';

import type { IndexPatternSelectProps } from '@kbn/unified-search-plugin/public';
import { euiThemeVars } from '@kbn/ui-theme';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';

import { TimeFieldWarning } from '../../components/time_field_warning';

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
  const isMounted = useMountedState();

  const [formInput, setFormInput] = useState<LogRateAnalysisEmbeddableRuntimeState>(
    pick(initialInput ?? {}, ['dataViewId']) as LogRateAnalysisEmbeddableRuntimeState
  );

  // State to track if the selected data view is time based, undefined is used
  // to track that the check is in progress.
  const [isDataViewTimeBased, setIsDataViewTimeBased] = useState<boolean | undefined>();

  const isFormValid = useMemo(
    () =>
      isPopulatedObject(formInput, ['dataViewId']) &&
      formInput.dataViewId !== '' &&
      isDataViewTimeBased === true,
    [formInput, isDataViewTimeBased]
  );

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
    [isFormValid, onPreview, updatedProps, isDataViewTimeBased]
  );

  const setDataViewId = useCallback(
    (dataViewId: string | undefined) => {
      setFormInput({
        ...formInput,
        dataViewId: dataViewId ?? '',
      });
      setIsDataViewTimeBased(undefined);
    },
    [formInput]
  );

  useEffect(
    function checkIsDataViewTimeBased() {
      setIsDataViewTimeBased(undefined);

      const { dataViewId } = formInput;

      if (!dataViewId) {
        return;
      }

      dataViews
        .get(dataViewId)
        .then((dataView) => {
          if (!isMounted()) {
            return;
          }
          setIsDataViewTimeBased(dataView.isTimeBased());
        })
        .catch(() => {
          setIsDataViewTimeBased(undefined);
        });
    },
    [dataViews, formInput, isMounted]
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
        <EuiForm data-test-subj="aiopsLogRateAnalysisControls">
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.aiops.embeddableLogRateAnalysis.config.dataViewLabel', {
              defaultMessage: 'Data view',
            })}
          >
            <>
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
                data-test-subj="aiopsLogRateAnalysisEmbeddableDataViewSelector"
              />
              {isDataViewTimeBased === false && (
                <>
                  <EuiSpacer size="m" />
                  <TimeFieldWarning />
                </>
              )}
            </>
          </EuiFormRow>
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
