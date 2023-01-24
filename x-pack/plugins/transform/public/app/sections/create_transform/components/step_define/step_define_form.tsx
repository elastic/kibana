/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, FC } from 'react';
import { merge } from 'rxjs';

import {
  EuiButton,
  EuiButtonIcon,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { mlTimefilterRefresh$, useTimefilter, DatePickerWrapper } from '@kbn/ml-date-picker';
import { useUrlState } from '@kbn/ml-url-state';

import { PivotAggDict } from '../../../../../../common/types/pivot_aggs';
import { PivotGroupByDict } from '../../../../../../common/types/pivot_group_by';
import { TRANSFORM_FUNCTION } from '../../../../../../common/constants';

import {
  getIndexDevConsoleStatement,
  getTransformPreviewDevConsoleStatement,
} from '../../../../common/data_grid';
import {
  getPreviewTransformRequestBody,
  PivotAggsConfigDict,
  PivotGroupByConfigDict,
  PivotSupportedGroupByAggs,
  PivotAggsConfig,
} from '../../../../common';
import { useDocumentationLinks } from '../../../../hooks/use_documentation_links';
import { useIndexData } from '../../../../hooks/use_index_data';
import { useTransformConfigData } from '../../../../hooks/use_transform_config_data';
import { useAppDependencies, useToastNotifications } from '../../../../app_dependencies';
import { SearchItems } from '../../../../hooks/use_search_items';
import { getAggConfigFromEsAgg } from '../../../../common/pivot_aggs';

import { AdvancedQueryEditorSwitch } from '../advanced_query_editor_switch';
import { AdvancedSourceEditor } from '../advanced_source_editor';
import { DatePickerApplySwitch } from '../date_picker_apply_switch';
import { SourceSearchBar } from '../source_search_bar';
import { AdvancedRuntimeMappingsSettings } from '../advanced_runtime_mappings_settings';

import { StepDefineExposedState } from './common';
import { useStepDefineForm } from './hooks/use_step_define_form';
import { TransformFunctionSelector } from './transform_function_selector';
import { LatestFunctionForm } from './latest_function_form';
import { PivotFunctionForm } from './pivot_function_form';

const advancedEditorsSidebarWidth = '220px';

export const ConfigSectionTitle: FC<{ title: string }> = ({ title }) => (
  <>
    <EuiSpacer size="m" />
    <EuiTitle size="xs">
      <span>{title}</span>
    </EuiTitle>
    <EuiSpacer size="s" />
  </>
);

export interface StepDefineFormProps {
  overrides?: StepDefineExposedState;
  onChange(s: StepDefineExposedState): void;
  searchItems: SearchItems;
}

export const StepDefineForm: FC<StepDefineFormProps> = React.memo((props) => {
  const [globalState, setGlobalState] = useUrlState('_g');
  const { searchItems } = props;
  const { dataView } = searchItems;
  const indexPattern = useMemo(() => dataView.getIndexPattern(), [dataView]);
  const {
    ml: { DataGrid },
  } = useAppDependencies();
  const toastNotifications = useToastNotifications();
  const stepDefineForm = useStepDefineForm(props);

  const { advancedEditorConfig } = stepDefineForm.advancedPivotEditor.state;
  const {
    advancedEditorSourceConfig,
    isAdvancedSourceEditorEnabled,
    isAdvancedSourceEditorApplyButtonEnabled,
  } = stepDefineForm.advancedSourceEditor.state;
  const { isDatePickerApplyEnabled, timeRangeMs } = stepDefineForm.datePicker.state;
  const { transformConfigQuery } = stepDefineForm.searchBar.state;
  const { runtimeMappings } = stepDefineForm.runtimeMappingsEditor.state;

  const indexPreviewProps = {
    ...useIndexData(dataView, transformConfigQuery, runtimeMappings, timeRangeMs),
    dataTestSubj: 'transformIndexPreview',
    toastNotifications,
  };
  const { requestPayload, validationStatus } =
    stepDefineForm.transformFunction === TRANSFORM_FUNCTION.PIVOT
      ? stepDefineForm.pivotConfig.state
      : stepDefineForm.latestFunctionConfig;

  const copyToClipboardSource = getIndexDevConsoleStatement(transformConfigQuery, indexPattern);
  const copyToClipboardSourceDescription = i18n.translate(
    'xpack.transform.indexPreview.copyClipboardTooltip',
    {
      defaultMessage: 'Copy Dev Console statement of the index preview to the clipboard.',
    }
  );

  const copyToClipboardPreviewRequest = getPreviewTransformRequestBody(
    dataView,
    transformConfigQuery,
    requestPayload,
    runtimeMappings,
    isDatePickerApplyEnabled ? timeRangeMs : undefined
  );

  const copyToClipboardPivot = getTransformPreviewDevConsoleStatement(
    copyToClipboardPreviewRequest
  );
  const copyToClipboardPivotDescription = i18n.translate(
    'xpack.transform.pivotPreview.copyClipboardTooltip',
    {
      defaultMessage: 'Copy Dev Console statement of the transform preview to the clipboard.',
    }
  );

  const previewProps = {
    ...useTransformConfigData(
      dataView,
      transformConfigQuery,
      validationStatus,
      requestPayload,
      runtimeMappings,
      timeRangeMs
    ),
    dataTestSubj: 'transformPivotPreview',
    toastNotifications,
    ...(stepDefineForm.transformFunction === TRANSFORM_FUNCTION.LATEST
      ? {
          copyToClipboard: copyToClipboardPivot,
          copyToClipboardDescription: copyToClipboardPivotDescription,
        }
      : {}),
  };

  const applySourceChangesHandler = () => {
    const sourceConfig = JSON.parse(advancedEditorSourceConfig);
    stepDefineForm.searchBar.actions.setSearchQuery(sourceConfig);
    stepDefineForm.advancedSourceEditor.actions.applyAdvancedSourceEditorChanges();
  };

  const applyPivotChangesHandler = () => {
    const pivot = JSON.parse(
      stepDefineForm.advancedPivotEditor.actions.convertToJson(advancedEditorConfig)
    );

    const newGroupByList: PivotGroupByConfigDict = {};
    if (pivot !== undefined && pivot.group_by !== undefined) {
      Object.entries(pivot.group_by).forEach((d) => {
        const aggName = d[0];
        const aggConfig = d[1] as PivotGroupByDict;
        const aggConfigKeys = Object.keys(aggConfig);
        const agg = aggConfigKeys[0] as PivotSupportedGroupByAggs;
        newGroupByList[aggName] = {
          ...aggConfig[agg],
          agg,
          aggName,
          dropDownName: '',
        };
      });
    }
    stepDefineForm.pivotConfig.actions.setGroupByList(newGroupByList);

    const newAggList: PivotAggsConfigDict = {};
    if (pivot !== undefined && pivot.aggregations !== undefined) {
      Object.entries(pivot.aggregations).forEach((d) => {
        const aggName = d[0];
        const aggConfig = d[1] as PivotAggDict;

        newAggList[aggName] = getAggConfigFromEsAgg(aggConfig, aggName) as PivotAggsConfig;
      });
    }
    stepDefineForm.pivotConfig.actions.setAggList(newAggList);

    stepDefineForm.advancedPivotEditor.actions.setAdvancedEditorConfigLastApplied(
      advancedEditorConfig
    );
    stepDefineForm.advancedPivotEditor.actions.setAdvancedPivotEditorApplyButtonEnabled(false);
  };

  const { esQueryDsl } = useDocumentationLinks();

  const hasValidTimeField = useMemo(
    () => dataView.timeFieldName !== undefined && dataView.timeFieldName !== '',
    [dataView.timeFieldName]
  );

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

  return (
    <div data-test-subj="transformStepDefineForm">
      <EuiForm>
        <EuiFormRow fullWidth>
          <TransformFunctionSelector
            selectedFunction={stepDefineForm.transformFunction}
            onChange={stepDefineForm.setTransformFunction}
          />
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
            label={i18n.translate('xpack.transform.stepDefineForm.datePickerLabel', {
              defaultMessage: 'Time range',
            })}
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
                <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
                  <EuiFlexItem grow={false}>
                    {searchItems.savedSearch === undefined && (
                      <DatePickerApplySwitch {...stepDefineForm} />
                    )}
                  </EuiFlexItem>
                </EuiFlexGroup>
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
                    {!isAdvancedSourceEditorEnabled && (
                      <SourceSearchBar dataView={dataView} searchBar={stepDefineForm.searchBar} />
                    )}
                    {isAdvancedSourceEditorEnabled && <AdvancedSourceEditor {...stepDefineForm} />}
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
                        {searchItems.savedSearch === undefined && (
                          <AdvancedQueryEditorSwitch {...stepDefineForm} />
                        )}
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
            <AdvancedRuntimeMappingsSettings {...stepDefineForm} />
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
        {stepDefineForm.transformFunction === TRANSFORM_FUNCTION.PIVOT ? (
          <PivotFunctionForm
            {...{
              applyPivotChangesHandler,
              copyToClipboardPivot,
              copyToClipboardPivotDescription,
              stepDefineForm,
            }}
          />
        ) : null}
        {stepDefineForm.transformFunction === TRANSFORM_FUNCTION.LATEST ? (
          <LatestFunctionForm
            copyToClipboard={copyToClipboardPivot}
            copyToClipboardDescription={copyToClipboardPivotDescription}
            latestFunctionService={stepDefineForm.latestFunctionConfig}
          />
        ) : null}
      </EuiForm>
      <EuiSpacer size="m" />
      {(stepDefineForm.transformFunction !== TRANSFORM_FUNCTION.LATEST ||
        stepDefineForm.latestFunctionConfig.sortFieldOptions.length > 0) && (
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
});
