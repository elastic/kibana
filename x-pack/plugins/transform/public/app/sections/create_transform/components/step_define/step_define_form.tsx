/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { i18n } from '@kbn/i18n';

import {
  EuiButtonIcon,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormHelpText,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { DataGrid } from '../../../../../shared_imports';

import {
  getIndexDevConsoleStatement,
  getPivotPreviewDevConsoleStatement,
} from '../../../../common/data_grid';

import { getPreviewRequestBody } from '../../../../common';
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

export interface StepDefineFormProps {
  overrides?: StepDefineExposedState;
  onChange(s: StepDefineExposedState): void;
  searchItems: SearchItems;
}

export const StepDefineForm: FC<StepDefineFormProps> = React.memo(props => {
  const { searchItems } = props;
  const { indexPattern } = searchItems;

  const toastNotifications = useToastNotifications();
  const stepDefineForm = useStepDefineForm(props);

  const { isAdvancedPivotEditorEnabled } = stepDefineForm.advancedPivotEditor.state;
  const { isAdvancedSourceEditorEnabled } = stepDefineForm.advancedSourceEditor.state;
  const {
    aggList,
    groupByList,
    pivotGroupByArr,
    pivotAggsArr,
    valid,
  } = stepDefineForm.pivotConfig.state;
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
    copyToClipboard: getPivotPreviewDevConsoleStatement(previewRequest),
    copyToClipboardDescription: i18n.translate(
      'xpack.transform.pivotPreview.copyClipboardTooltip',
      {
        defaultMessage: 'Copy Dev Console statement of the pivot preview to the clipboard.',
      }
    ),
    dataTestSubj: 'transformPivotPreview',
    title: i18n.translate('xpack.transform.pivotPreview.PivotPreviewTitle', {
      defaultMessage: 'Transform pivot preview',
    }),
    toastNotifications,
  };

  // TODO This should use the actual value of `indices.query.bool.max_clause_count`
  const maxIndexFields = 1024;
  const numIndexFields = indexPattern.fields.length;
  const disabledQuery = numIndexFields > maxIndexFields;

  const copyToClipboard = getIndexDevConsoleStatement(pivotQuery, indexPattern.title);
  const copyToClipboardDescription = i18n.translate(
    'xpack.transform.indexPreview.copyClipboardTooltip',
    {
      defaultMessage: 'Copy Dev Console statement of the index preview to the clipboard.',
    }
  );

  return (
    <div data-test-subj="transformStepDefineForm">
      <EuiForm>
        {searchItems.savedSearch === undefined && (
          <>
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
            {!disabledQuery && !isAdvancedSourceEditorEnabled && (
              <SourceSearchBar indexPattern={indexPattern} searchBar={stepDefineForm.searchBar} />
            )}
          </>
        )}

        {isAdvancedSourceEditorEnabled && <AdvancedSourceEditor {...stepDefineForm} />}
        {searchItems.savedSearch === undefined && <AdvancedQueryEditorSwitch {...stepDefineForm} />}
        {searchItems.savedSearch !== undefined && searchItems.savedSearch.id !== undefined && (
          <EuiFormRow
            label={i18n.translate('xpack.transform.stepDefineForm.savedSearchLabel', {
              defaultMessage: 'Saved search',
            })}
          >
            <span>{searchItems.savedSearch.title}</span>
          </EuiFormRow>
        )}
      </EuiForm>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiTitle size="xs">
            <span>
              {i18n.translate('xpack.transform.indexPreview.indexPatternTitle', {
                defaultMessage: 'Index {indexPatternTitle}',
                values: { indexPatternTitle: indexPattern.title },
              })}
            </span>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiCopy beforeMessage={copyToClipboardDescription} textToCopy={copyToClipboard}>
            {(copy: () => void) => (
              <EuiButtonIcon
                onClick={copy}
                iconType="copyClipboard"
                aria-label={copyToClipboardDescription}
              />
            )}
          </EuiCopy>
        </EuiFlexItem>
      </EuiFlexGroup>
      <DataGrid {...indexPreviewProps} />
      <EuiHorizontalRule />
      <EuiForm>
        {!isAdvancedPivotEditorEnabled && <PivotConfiguration {...stepDefineForm.pivotConfig} />}
        {isAdvancedPivotEditorEnabled && (
          <AdvancedPivotEditor {...stepDefineForm.advancedPivotEditor} />
        )}
        <AdvancedPivotEditorSwitch {...stepDefineForm} />
        {!valid && (
          <>
            <EuiSpacer size="m" />
            <EuiFormHelpText style={{ maxWidth: '320px' }}>
              {i18n.translate('xpack.transform.stepDefineForm.formHelp', {
                defaultMessage:
                  'Transforms are scalable and automated processes for pivoting. Choose at least one group-by and aggregation to get started.',
              })}
            </EuiFormHelpText>
          </>
        )}
      </EuiForm>
      <DataGrid {...pivotPreviewProps} />
    </div>
  );
});
