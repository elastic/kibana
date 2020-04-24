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
  EuiLink,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { DataGrid } from '../../../../../shared_imports';

import {
  getIndexDevConsoleStatement,
  getPivotPreviewDevConsoleStatement,
} from '../../../../common/data_grid';

import { useDocumentationLinks } from '../../../../hooks/use_documentation_links';
import { SearchItems } from '../../../../hooks/use_search_items';
import { useIndexData } from '../../../../hooks/use_index_data';
import { usePivotData } from '../../../../hooks/use_pivot_data';
import { useToastNotifications } from '../../../../app_dependencies';

import { AdvancedPivotEditor } from '../advanced_pivot_editor';
import { AdvancedPivotEditorSwitch } from '../advanced_pivot_editor_switch';
import { AdvancedQueryEditorSwitch } from '../advanced_query_editor_switch';
import { AdvancedSourceEditor } from '../advanced_source_editor';
import { PivotConfiguration } from '../pivot_configuration';
import { SourceSearchBar } from '../source_search_bar';

import { StepDefineExposedState } from './common';

import { useStepDefineForm } from './use_step_define_form';

type StepDefineFormHook = ReturnType<typeof useStepDefineForm>;
export const StepDefineFormContext = React.createContext<StepDefineFormHook>(
  (null as unknown) as StepDefineFormHook
);

export interface StepDefineFormProps {
  overrides?: StepDefineExposedState;
  onChange(s: StepDefineExposedState): void;
  searchItems: SearchItems;
}

export const StepDefineForm: FC<StepDefineFormProps> = React.memo(props => {
  const { searchItems } = props;
  const { indexPattern } = searchItems;

  const toastNotifications = useToastNotifications();

  const { state, actions } = useStepDefineForm(props);
  const indexPreviewProps = useIndexData(indexPattern, state.pivotQuery);
  const pivotPreviewProps = usePivotData(
    indexPattern.title,
    state.pivotQuery,
    state.aggList,
    state.groupByList
  );

  const { esQueryDsl, esTransformPivot } = useDocumentationLinks();

  const advancedEditorHelpTextLinkText = i18n.translate(
    'xpack.transform.stepDefineForm.advancedEditorHelpTextLink',
    {
      defaultMessage: 'Learn more about available options.',
    }
  );

  const advancedEditorHelpText = (
    <>
      {i18n.translate('xpack.transform.stepDefineForm.advancedEditorHelpText', {
        defaultMessage:
          'The advanced editor allows you to edit the pivot configuration of the transform.',
      })}{' '}
      <EuiLink href={esTransformPivot} target="_blank">
        {advancedEditorHelpTextLinkText}
      </EuiLink>
    </>
  );

  const advancedSourceEditorHelpText = (
    <>
      {i18n.translate('xpack.transform.stepDefineForm.advancedSourceEditorHelpText', {
        defaultMessage:
          'The advanced editor allows you to edit the source query clause of the transform.',
      })}{' '}
      <EuiLink href={esQueryDsl} target="_blank">
        {advancedEditorHelpTextLinkText}
      </EuiLink>
    </>
  );

  // TODO This should use the actual value of `indices.query.bool.max_clause_count`
  const maxIndexFields = 1024;
  const numIndexFields = indexPattern.fields.length;
  const disabledQuery = numIndexFields > maxIndexFields;

  const copyToClipboard = getIndexDevConsoleStatement(state.pivotQuery, indexPattern.title);
  const copyToClipboardDescription = i18n.translate(
    'xpack.transform.indexPreview.copyClipboardTooltip',
    {
      defaultMessage: 'Copy Dev Console statement of the index preview to the clipboard.',
    }
  );

  return (
    <StepDefineFormContext.Provider value={{ state, actions }}>
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
              {!disabledQuery && !state.isAdvancedSourceEditorEnabled && (
                <SourceSearchBar indexPattern={indexPattern} />
              )}
            </>
          )}

          {state.isAdvancedSourceEditorEnabled && (
            <AdvancedSourceEditor advancedSourceEditorHelpText={advancedSourceEditorHelpText} />
          )}
          {searchItems.savedSearch === undefined && <AdvancedQueryEditorSwitch />}
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
      </div>
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
      <DataGrid
        {...indexPreviewProps}
        dataTestSubj="transformIndexPreview"
        toastNotifications={toastNotifications}
      />
      <EuiHorizontalRule />
      <EuiForm>
        {!state.isAdvancedPivotEditorEnabled && <PivotConfiguration />}
        {state.isAdvancedPivotEditorEnabled && (
          <AdvancedPivotEditor advancedEditorHelpText={advancedEditorHelpText} />
        )}
        <AdvancedPivotEditorSwitch />
        {!state.valid && (
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
      <DataGrid
        {...pivotPreviewProps}
        copyToClipboard={getPivotPreviewDevConsoleStatement(state.previewRequest)}
        copyToClipboardDescription={i18n.translate(
          'xpack.transform.pivotPreview.copyClipboardTooltip',
          {
            defaultMessage: 'Copy Dev Console statement of the pivot preview to the clipboard.',
          }
        )}
        dataTestSubj="transformPivotPreview"
        title={i18n.translate('xpack.transform.pivotPreview.PivotPreviewTitle', {
          defaultMessage: 'Transform pivot preview',
        })}
        toastNotifications={toastNotifications}
      />
    </StepDefineFormContext.Provider>
  );
});
