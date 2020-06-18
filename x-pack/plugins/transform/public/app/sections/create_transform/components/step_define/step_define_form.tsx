/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { i18n } from '@kbn/i18n';

import {
  EuiButton,
  EuiButtonIcon,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { DataGrid } from '../../../../../shared_imports';

import {
  getIndexDevConsoleStatement,
  getPivotPreviewDevConsoleStatement,
} from '../../../../common/data_grid';

import {
  getPreviewRequestBody,
  PivotAggDict,
  PivotAggsConfigDict,
  PivotGroupByDict,
  PivotGroupByConfigDict,
  PivotSupportedGroupByAggs,
  PivotAggsConfig,
} from '../../../../common';
import { useDocumentationLinks } from '../../../../hooks/use_documentation_links';
import { useIndexData } from '../../../../hooks/use_index_data';
import { usePivotData } from '../../../../hooks/use_pivot_data';
import { useToastNotifications } from '../../../../app_dependencies';
import { SearchItems } from '../../../../hooks/use_search_items';

import { AdvancedPivotEditor } from '../advanced_pivot_editor';
import { AdvancedPivotEditorSwitch } from '../advanced_pivot_editor_switch';
import { AdvancedQueryEditorSwitch } from '../advanced_query_editor_switch';
import { AdvancedSourceEditor } from '../advanced_source_editor';
import { PivotConfiguration } from '../pivot_configuration';
import { SourceSearchBar } from '../source_search_bar';

import { StepDefineExposedState } from './common';
import { useStepDefineForm } from './hooks/use_step_define_form';
import { getAggConfigFromEsAgg } from '../../../../common/pivot_aggs';

export interface StepDefineFormProps {
  overrides?: StepDefineExposedState;
  onChange(s: StepDefineExposedState): void;
  searchItems: SearchItems;
}

export const StepDefineForm: FC<StepDefineFormProps> = React.memo((props) => {
  const { searchItems } = props;
  const { indexPattern } = searchItems;

  const toastNotifications = useToastNotifications();
  const stepDefineForm = useStepDefineForm(props);

  const {
    advancedEditorConfig,
    isAdvancedPivotEditorEnabled,
    isAdvancedPivotEditorApplyButtonEnabled,
  } = stepDefineForm.advancedPivotEditor.state;
  const {
    advancedEditorSourceConfig,
    isAdvancedSourceEditorEnabled,
    isAdvancedSourceEditorApplyButtonEnabled,
  } = stepDefineForm.advancedSourceEditor.state;
  const { aggList, groupByList, pivotGroupByArr, pivotAggsArr } = stepDefineForm.pivotConfig.state;
  const pivotQuery = stepDefineForm.searchBar.state.pivotQuery;

  const indexPreviewProps = {
    ...useIndexData(indexPattern, stepDefineForm.searchBar.state.pivotQuery),
    dataTestSubj: 'transformIndexPreview',
    toastNotifications,
  };

  const previewRequest = getPreviewRequestBody(
    indexPattern.title,
    pivotQuery,
    pivotGroupByArr,
    pivotAggsArr
  );

  const pivotPreviewProps = {
    ...usePivotData(indexPattern.title, pivotQuery, aggList, groupByList),
    dataTestSubj: 'transformPivotPreview',
    toastNotifications,
  };

  // TODO This should use the actual value of `indices.query.bool.max_clause_count`
  const maxIndexFields = 1024;
  const numIndexFields = indexPattern.fields.length;
  const disabledQuery = numIndexFields > maxIndexFields;

  const copyToClipboardSource = getIndexDevConsoleStatement(pivotQuery, indexPattern.title);
  const copyToClipboardSourceDescription = i18n.translate(
    'xpack.transform.indexPreview.copyClipboardTooltip',
    {
      defaultMessage: 'Copy Dev Console statement of the index preview to the clipboard.',
    }
  );

  const copyToClipboardPivot = getPivotPreviewDevConsoleStatement(previewRequest);
  const copyToClipboardPivotDescription = i18n.translate(
    'xpack.transform.pivotPreview.copyClipboardTooltip',
    {
      defaultMessage: 'Copy Dev Console statement of the pivot preview to the clipboard.',
    }
  );

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
  const { esTransformPivot } = useDocumentationLinks();

  const advancedEditorsSidebarWidth = '220px';

  return (
    <div data-test-subj="transformStepDefineForm">
      <EuiForm>
        {searchItems.savedSearch === undefined && (
          <EuiFormRow
            label={i18n.translate('xpack.transform.stepDefineForm.indexPatternLabel', {
              defaultMessage: 'Index pattern',
            })}
            helpText={
              disabledQuery
                ? i18n.translate('xpack.transform.stepDefineForm.indexPatternHelpText', {
                    defaultMessage:
                      'An optional query for this index pattern is not supported. The number of supported index fields is {maxIndexFields} whereas this index has {numIndexFields} fields.',
                    values: {
                      maxIndexFields,
                      numIndexFields,
                    },
                  })
                : ''
            }
          >
            <span>{indexPattern.title}</span>
          </EuiFormRow>
        )}
        <EuiFormRow
          fullWidth
          hasEmptyLabelSpace={searchItems?.savedSearch?.id === undefined}
          label={
            searchItems?.savedSearch?.id !== undefined
              ? i18n.translate('xpack.transform.stepDefineForm.savedSearchLabel', {
                  defaultMessage: 'Saved search',
                })
              : ''
          }
        >
          <>
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
              <EuiFlexItem>
                {/* Flex Column #1: Search Bar / Advanced Search Editor */}
                {searchItems.savedSearch === undefined && (
                  <>
                    {!disabledQuery && !isAdvancedSourceEditorEnabled && (
                      <SourceSearchBar
                        indexPattern={indexPattern}
                        searchBar={stepDefineForm.searchBar}
                      />
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
                        )}{' '}
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
            <DataGrid {...indexPreviewProps} />
          </>
        </EuiFormRow>
      </EuiForm>
      <EuiHorizontalRule margin="m" />
      <EuiForm>
        <EuiFlexGroup justifyContent="spaceBetween">
          {/* Flex Column #1: Pivot Config Form / Advanced Pivot Config Editor */}
          <EuiFlexItem>
            {!isAdvancedPivotEditorEnabled && (
              <PivotConfiguration {...stepDefineForm.pivotConfig} />
            )}
            {isAdvancedPivotEditorEnabled && (
              <AdvancedPivotEditor {...stepDefineForm.advancedPivotEditor} />
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false} style={{ width: advancedEditorsSidebarWidth }}>
            <EuiFlexGroup gutterSize="xs" direction="column" justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiFormRow hasEmptyLabelSpace>
                  <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
                    <EuiFlexItem grow={false}>
                      <AdvancedPivotEditorSwitch {...stepDefineForm} />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiCopy
                        beforeMessage={copyToClipboardPivotDescription}
                        textToCopy={copyToClipboardPivot}
                      >
                        {(copy: () => void) => (
                          <EuiButtonIcon
                            onClick={copy}
                            iconType="copyClipboard"
                            aria-label={copyToClipboardPivotDescription}
                          />
                        )}
                      </EuiCopy>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFormRow>
              </EuiFlexItem>
              {isAdvancedPivotEditorEnabled && (
                <EuiFlexItem style={{ width: advancedEditorsSidebarWidth }}>
                  <EuiSpacer size="s" />
                  <EuiText size="xs">
                    <>
                      {i18n.translate('xpack.transform.stepDefineForm.advancedEditorHelpText', {
                        defaultMessage:
                          'The advanced editor allows you to edit the pivot configuration of the transform.',
                      })}{' '}
                      <EuiLink href={esTransformPivot} target="_blank">
                        {i18n.translate(
                          'xpack.transform.stepDefineForm.advancedEditorHelpTextLink',
                          {
                            defaultMessage: 'Learn more about available options.',
                          }
                        )}
                      </EuiLink>
                    </>
                  </EuiText>
                  <EuiSpacer size="s" />
                  <EuiButton
                    style={{ width: 'fit-content' }}
                    size="s"
                    fill
                    onClick={applyPivotChangesHandler}
                    disabled={!isAdvancedPivotEditorApplyButtonEnabled}
                  >
                    {i18n.translate(
                      'xpack.transform.stepDefineForm.advancedEditorApplyButtonText',
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
      </EuiForm>
      <EuiSpacer size="m" />
      <DataGrid {...pivotPreviewProps} />
      <EuiSpacer size="m" />
    </div>
  );
});
