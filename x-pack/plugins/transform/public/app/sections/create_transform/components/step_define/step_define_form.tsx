/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, FC } from 'react';
import { merge } from 'rxjs';
import { useSelector } from 'react-redux';

import {
  EuiButton,
  EuiButtonIcon,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiIconTip,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { DataGrid } from '@kbn/ml-data-grid';
import {
  mlTimefilterRefresh$,
  useTimefilter,
  DatePickerWrapper,
  FullTimeRangeSelector,
  FROZEN_TIER_PREFERENCE,
} from '@kbn/ml-date-picker';
import { useStorage } from '@kbn/ml-local-storage';
import { useUrlState } from '@kbn/ml-url-state';

import { TRANSFORM_FUNCTION } from '../../../../../../common/constants';
import {
  TRANSFORM_FROZEN_TIER_PREFERENCE,
  type TransformStorageKey,
  type TransformStorageMapped,
} from '../../../../../../common/types/storage';

import {
  getIndexDevConsoleStatement,
  getTransformPreviewDevConsoleStatement,
} from '../../../../common/data_grid';
import { getPreviewTransformRequestBody } from '../../../../common';
import { useDocumentationLinks } from '../../../../hooks/use_documentation_links';
import { useIndexData } from '../../../../hooks/use_index_data';
import { useTransformConfigData } from '../../../../hooks/use_transform_config_data';
import { useAppDependencies, useToastNotifications } from '../../../../app_dependencies';

import { useWizardContext } from '../wizard/wizard';
import { useWizardActions, useWizardSelector } from '../../state_management/create_transform_store';
import {
  selectPreviewRequest,
  selectTransformConfigQuery,
  selectValidatedRequestPayload,
} from '../../state_management/step_define_selectors';

import { AdvancedQueryEditorSwitch } from '../advanced_query_editor_switch';
import { AdvancedSourceEditor } from '../advanced_source_editor';
import { DatePickerApplySwitch } from '../date_picker_apply_switch';
import { SourceSearchBar } from '../source_search_bar';
import { AdvancedRuntimeMappingsSettings } from '../advanced_runtime_mappings_settings';

import { useDatePicker } from './hooks/use_date_picker';
import { useLatestFunctionOptions } from './hooks/use_latest_function_config';
import { TransformFunctionSelector } from './transform_function_selector';
import { LatestFunctionForm } from './latest_function_form';
import { PivotFunctionForm } from './pivot_function_form';

const ALLOW_TIME_RANGE_ON_TRANSFORM_CONFIG = false;

const advancedEditorsSidebarWidth = '220px';

type PopulatedFields = Set<string>;
const isPopulatedFields = (arg: unknown): arg is PopulatedFields => arg instanceof Set;

export const ConfigSectionTitle: FC<{ title: string }> = ({ title }) => (
  <>
    <EuiSpacer size="m" />
    <EuiTitle size="xs">
      <span>{title}</span>
    </EuiTitle>
    <EuiSpacer size="s" />
  </>
);

export const StepDefineForm: FC = () => {
  const [globalState, setGlobalState] = useUrlState('_g');
  const { searchItems } = useWizardContext();
  const { dataView } = searchItems;
  const indexPattern = useMemo(() => dataView.getIndexPattern(), [dataView]);
  const [frozenDataPreference, setFrozenDataPreference] = useStorage<
    TransformStorageKey,
    TransformStorageMapped<typeof TRANSFORM_FROZEN_TIER_PREFERENCE>
  >(
    TRANSFORM_FROZEN_TIER_PREFERENCE,
    // By default we will exclude frozen data tier
    FROZEN_TIER_PREFERENCE.EXCLUDE
  );
  const toastNotifications = useToastNotifications();
  const { hasValidTimeField } = useDatePicker();
  const latestFunctionOptions = useLatestFunctionOptions();
  const isAdvancedPivotEditorEnabled = useWizardSelector(
    (s) => s.advancedPivotEditor.isAdvancedPivotEditorEnabled
  );
  const isAdvancedSourceEditorEnabled = useWizardSelector(
    (s) => s.advancedSourceEditor.isAdvancedSourceEditorEnabled
  );
  const advancedSourceEditorConfig = useWizardSelector(
    (s) => s.advancedSourceEditor.advancedSourceEditorConfig
  );
  const isAdvancedSourceEditorApplyButtonEnabled = useWizardSelector(
    (s) => s.advancedSourceEditor.isAdvancedSourceEditorApplyButtonEnabled
  );
  const isRuntimeMappingsEditorEnabled = useWizardSelector(
    (s) => s.advancedRuntimeMappingsEditor.isRuntimeMappingsEditorEnabled
  );
  const timeRangeMs = useWizardSelector((s) => s.stepDefine.timeRangeMs);
  const transformFunction = useWizardSelector((s) => s.stepDefine.transformFunction);
  const runtimeMappings = useWizardSelector((s) => s.advancedRuntimeMappingsEditor.runtimeMappings);
  const transformConfigQuery = useSelector(selectTransformConfigQuery);
  const {
    applyAdvancedSourceEditorChanges,
    setAdvancedEditorConfig,
    setAdvancedEditorConfigLastApplied,
    setAdvancedSourceEditorConfig,
    setAdvancedSourceEditorConfigLastApplied,
    setAdvancedRuntimeMappingsConfig,
    setAdvancedRuntimeMappingsConfigLastApplied,
    setSearchQuery,
  } = useWizardActions();

  const appDependencies = useAppDependencies();
  const {
    ml: { useFieldStatsFlyoutContext },
  } = appDependencies;

  const fieldStatsContext = useFieldStatsFlyoutContext();
  const indexPreviewProps = {
    ...useIndexData(
      dataView,
      transformConfigQuery,
      runtimeMappings,
      timeRangeMs,
      isPopulatedFields(fieldStatsContext?.populatedFields)
        ? [...fieldStatsContext.populatedFields]
        : []
    ),
    dataTestSubj: 'transformIndexPreview',
    toastNotifications,
  };

  const { requestPayload } = useSelector(selectValidatedRequestPayload);

  const copyToClipboardSource = getIndexDevConsoleStatement(transformConfigQuery, indexPattern);
  const copyToClipboardSourceDescription = i18n.translate(
    'xpack.transform.indexPreview.copyClipboardTooltip',
    {
      defaultMessage: 'Copy Dev Console statement of the index preview to the clipboard.',
    }
  );

  const copyToClipboardPreviewRequest = useWizardSelector((state) =>
    selectPreviewRequest(state, dataView)
  );

  const copyToClipboard = getTransformPreviewDevConsoleStatement(copyToClipboardPreviewRequest);
  const copyToClipboardDescription = i18n.translate(
    'xpack.transform.pivotPreview.copyClipboardTooltip',
    {
      defaultMessage: 'Copy Dev Console statement of the transform preview to the clipboard.',
    }
  );

  const previewProps = {
    ...useTransformConfigData(),
    dataTestSubj: 'transformPivotPreview',
    toastNotifications,
    ...(transformFunction === TRANSFORM_FUNCTION.LATEST
      ? {
          copyToClipboard,
          copyToClipboardDescription,
        }
      : {}),
  };

  const applySourceChangesHandler = () => {
    const sourceConfig = JSON.parse(advancedSourceEditorConfig);
    setSearchQuery(sourceConfig);
    applyAdvancedSourceEditorChanges();
  };

  const { esQueryDsl } = useDocumentationLinks();

  const timefilter = useTimefilter({
    timeRangeSelector: dataView?.timeFieldName !== undefined,
    autoRefreshSelector: false,
  });

  useEffect(() => {
    if (globalState?.time !== undefined) {
      timefilter.setTime({
        from: globalState.time.from,
        to: globalState.time.to,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(globalState?.time), timefilter]);

  useEffect(() => {
    if (globalState?.refreshInterval !== undefined) {
      timefilter.setRefreshInterval(globalState.refreshInterval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(globalState?.refreshInterval), timefilter]);

  useEffect(() => {
    const timeUpdateSubscription = merge(
      timefilter.getAutoRefreshFetch$(),
      timefilter.getTimeUpdate$(),
      mlTimefilterRefresh$
    ).subscribe(() => {
      if (setGlobalState) {
        setGlobalState({
          time: timefilter.getTime(),
          refreshInterval: timefilter.getRefreshInterval(),
        });
      }
    });
    return () => {
      timeUpdateSubscription.unsubscribe();
    };
  });

  const previewRequest = useMemo(
    () =>
      getPreviewTransformRequestBody(
        dataView,
        transformConfigQuery,
        requestPayload,
        runtimeMappings
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transformConfigQuery, requestPayload, runtimeMappings]
  );

  useEffect(() => {
    if (!isAdvancedPivotEditorEnabled) {
      const stringifiedPivotConfig = JSON.stringify(previewRequest.pivot, null, 2);
      setAdvancedEditorConfigLastApplied(stringifiedPivotConfig);
      setAdvancedEditorConfig(stringifiedPivotConfig);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdvancedPivotEditorEnabled, previewRequest]);

  useEffect(() => {
    if (!isAdvancedSourceEditorEnabled) {
      const stringifiedSourceConfigUpdate = JSON.stringify(previewRequest.source.query, null, 2);

      setAdvancedSourceEditorConfigLastApplied(stringifiedSourceConfigUpdate);
      setAdvancedSourceEditorConfig(stringifiedSourceConfigUpdate);
    }
    /* eslint-disable react-hooks/exhaustive-deps */
  }, [isAdvancedSourceEditorEnabled]);

  useEffect(() => {
    if (!isRuntimeMappingsEditorEnabled) {
      const stringifiedRuntimeMappings = JSON.stringify(runtimeMappings, null, 2);
      setAdvancedRuntimeMappingsConfigLastApplied(stringifiedRuntimeMappings);
      setAdvancedRuntimeMappingsConfig(stringifiedRuntimeMappings);
    }
  }, [isRuntimeMappingsEditorEnabled, runtimeMappings]);

  return (
    <div data-test-subj="transformStepDefineForm">
      <EuiForm>
        <EuiFormRow fullWidth>
          <TransformFunctionSelector />
        </EuiFormRow>

        <ConfigSectionTitle title="Source data" />

        {searchItems.savedSearch === undefined && (
          <EuiFormRow
            label={i18n.translate('xpack.transform.stepDefineForm.dataViewLabel', {
              defaultMessage: 'Data view',
            })}
          >
            <span>{indexPattern}</span>
          </EuiFormRow>
        )}

        {hasValidTimeField && (
          <EuiFormRow
            fullWidth
            label={
              <>
                {i18n.translate('xpack.transform.stepDefineForm.datePickerLabel', {
                  defaultMessage: 'Time range',
                })}{' '}
                <EuiIconTip
                  content={i18n.translate(
                    'xpack.transform.stepDefineForm.datePickerIconTipContent',
                    {
                      defaultMessage:
                        'The time range is applied to previews only and will not be part of the final transform configuration.',
                    }
                  )}
                />
              </>
            }
          >
            <EuiFlexGroup alignItems="flexStart" justifyContent="spaceBetween">
              {/* Flex Column #1: Date Picker */}
              <EuiFlexItem>
                <DatePickerWrapper
                  isAutoRefreshOnly={!hasValidTimeField}
                  showRefresh={!hasValidTimeField}
                  width="full"
                />
              </EuiFlexItem>
              {/* Flex Column #2: Apply-To-Config option */}
              <EuiFlexItem grow={false} style={{ width: advancedEditorsSidebarWidth }}>
                {ALLOW_TIME_RANGE_ON_TRANSFORM_CONFIG && (
                  <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
                    <EuiFlexItem grow={false}>
                      {searchItems.savedSearch === undefined && <DatePickerApplySwitch />}
                    </EuiFlexItem>
                  </EuiFlexGroup>
                )}
                <FullTimeRangeSelector
                  frozenDataPreference={frozenDataPreference}
                  setFrozenDataPreference={setFrozenDataPreference}
                  dataView={dataView}
                  query={undefined}
                  disabled={false}
                  timefilter={timefilter}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>
        )}

        <EuiFormRow
          fullWidth
          label={
            searchItems?.savedSearch?.id !== undefined
              ? i18n.translate('xpack.transform.stepDefineForm.savedSearchLabel', {
                  defaultMessage: 'Saved search',
                })
              : i18n.translate('xpack.transform.stepDefineForm.searchFilterLabel', {
                  defaultMessage: 'Search filter',
                })
          }
        >
          <>
            <EuiFlexGroup alignItems="flexStart" justifyContent="spaceBetween">
              <EuiFlexItem>
                {/* Flex Column #1: Search Bar / Advanced Search Editor */}
                {searchItems.savedSearch === undefined && (
                  <>
                    {!isAdvancedSourceEditorEnabled && <SourceSearchBar />}
                    {isAdvancedSourceEditorEnabled && <AdvancedSourceEditor />}
                  </>
                )}
                {searchItems?.savedSearch?.id !== undefined && (
                  <span>{searchItems.savedSearch.title}</span>
                )}
              </EuiFlexItem>

              {/* Search options: Advanced Editor Switch / Copy to Clipboard / Advanced Editor Apply Button */}
              <EuiFlexItem grow={false} style={{ width: advancedEditorsSidebarWidth }}>
                <EuiFlexGroup gutterSize="xs" direction="column" justifyContent="spaceBetween">
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
                      <EuiFlexItem grow={false}>
                        {searchItems.savedSearch === undefined && <AdvancedQueryEditorSwitch />}
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiCopy
                          beforeMessage={copyToClipboardSourceDescription}
                          textToCopy={copyToClipboardSource}
                        >
                          {(copy: () => void) => (
                            <EuiButtonIcon
                              onClick={copy}
                              iconType="copyClipboard"
                              aria-label={copyToClipboardSourceDescription}
                            />
                          )}
                        </EuiCopy>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  {isAdvancedSourceEditorEnabled && (
                    <EuiFlexItem style={{ width: advancedEditorsSidebarWidth }}>
                      <EuiSpacer size="s" />
                      <EuiText size="xs">
                        {i18n.translate(
                          'xpack.transform.stepDefineForm.advancedSourceEditorHelpText',
                          {
                            defaultMessage:
                              'The advanced editor allows you to edit the source query clause of the transform configuration.',
                          }
                        )}
                        <EuiLink href={esQueryDsl} target="_blank">
                          {i18n.translate(
                            'xpack.transform.stepDefineForm.advancedEditorHelpTextLink',
                            {
                              defaultMessage: 'Learn more about available options.',
                            }
                          )}
                        </EuiLink>
                      </EuiText>
                      <EuiSpacer size="s" />
                      <EuiButton
                        style={{ width: 'fit-content' }}
                        size="s"
                        fill
                        onClick={applySourceChangesHandler}
                        disabled={!isAdvancedSourceEditorApplyButtonEnabled}
                      >
                        {i18n.translate(
                          'xpack.transform.stepDefineForm.advancedSourceEditorApplyButtonText',
                          {
                            defaultMessage: 'Apply changes',
                          }
                        )}
                      </EuiButton>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <AdvancedRuntimeMappingsSettings />
            <EuiSpacer size="s" />

            <EuiFormRow
              fullWidth={true}
              label={i18n.translate('xpack.transform.stepDefineForm.dataGridLabel', {
                defaultMessage: 'Source documents',
              })}
            >
              <DataGrid {...indexPreviewProps} />
            </EuiFormRow>
          </>
        </EuiFormRow>
      </EuiForm>

      <ConfigSectionTitle title="Transform configuration" />

      <EuiForm>
        {transformFunction === TRANSFORM_FUNCTION.PIVOT ? (
          <PivotFunctionForm
            {...{
              copyToClipboard,
              copyToClipboardDescription,
            }}
          />
        ) : null}
        {transformFunction === TRANSFORM_FUNCTION.LATEST ? (
          <LatestFunctionForm
            copyToClipboard={copyToClipboard}
            copyToClipboardDescription={copyToClipboardDescription}
          />
        ) : null}
      </EuiForm>
      <EuiSpacer size="m" />
      {(transformFunction !== TRANSFORM_FUNCTION.LATEST ||
        latestFunctionOptions.sortFieldOptions.length > 0) && (
        <EuiFormRow
          fullWidth
          label={i18n.translate('xpack.transform.stepDefineForm.previewLabel', {
            defaultMessage: 'Preview',
          })}
        >
          <>
            <DataGrid {...previewProps} />
            <EuiSpacer size="m" />
          </>
        </EuiFormRow>
      )}
    </div>
  );
};
