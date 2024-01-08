/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, type FC } from 'react';
import { useSelector } from 'react-redux';

import {
  EuiButton,
  EuiButtonIcon,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { getIndexDevConsoleStatement } from '../../../../common/data_grid';
import { useDocumentationLinks } from '../../../../hooks/use_documentation_links';

import { useWizardActions, useWizardSelector } from '../../state_management/create_transform_store';
import {
  selectPreviewRequest,
  selectTransformConfigQuery,
} from '../../state_management/step_define_selectors';

import { AdvancedQueryEditorSwitch } from '../advanced_query_editor_switch';
import { AdvancedSourceEditor } from '../advanced_source_editor';
import { SourceSearchBar } from '../source_search_bar';
import { useWizardContext } from '../wizard/wizard';

const advancedEditorsSidebarWidth = '220px';

export const SearchFilterFormRow: FC = () => {
  const { searchItems } = useWizardContext();
  const { dataView } = searchItems;
  const indexPattern = useMemo(() => dataView.getIndexPattern(), [dataView]);

  const advancedSourceEditorConfig = useWizardSelector(
    (s) => s.advancedSourceEditor.advancedSourceEditorConfig
  );
  const isAdvancedSourceEditorApplyButtonEnabled = useWizardSelector(
    (s) => s.advancedSourceEditor.isAdvancedSourceEditorApplyButtonEnabled
  );
  const isAdvancedSourceEditorEnabled = useWizardSelector(
    (s) => s.advancedSourceEditor.isAdvancedSourceEditorEnabled
  );
  const transformConfigQuery = useSelector(selectTransformConfigQuery);
  const {
    applyAdvancedSourceEditorChanges,
    setAdvancedSourceEditorConfig,
    setAdvancedSourceEditorConfigLastApplied,
    setSearchQuery,
  } = useWizardActions();

  const copyToClipboardSource = getIndexDevConsoleStatement(transformConfigQuery, indexPattern);
  const copyToClipboardSourceDescription = i18n.translate(
    'xpack.transform.indexPreview.copyClipboardTooltip',
    {
      defaultMessage: 'Copy Dev Console statement of the index preview to the clipboard.',
    }
  );

  const applySourceChangesHandler = () => {
    const sourceConfig = JSON.parse(advancedSourceEditorConfig);
    setSearchQuery(sourceConfig);
    applyAdvancedSourceEditorChanges();
  };

  const { esQueryDsl } = useDocumentationLinks();

  const previewRequest = useWizardSelector((s) => selectPreviewRequest(s, dataView));

  useEffect(() => {
    if (!isAdvancedSourceEditorEnabled) {
      const stringifiedSourceConfigUpdate = JSON.stringify(previewRequest.source.query, null, 2);

      setAdvancedSourceEditorConfigLastApplied(stringifiedSourceConfigUpdate);
      setAdvancedSourceEditorConfig(stringifiedSourceConfigUpdate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdvancedSourceEditorEnabled, previewRequest]);

  return (
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
                  {i18n.translate('xpack.transform.stepDefineForm.advancedSourceEditorHelpText', {
                    defaultMessage:
                      'The advanced editor allows you to edit the source query clause of the transform configuration.',
                  })}
                  <EuiLink href={esQueryDsl} target="_blank">
                    {i18n.translate('xpack.transform.stepDefineForm.advancedEditorHelpTextLink', {
                      defaultMessage: 'Learn more about available options.',
                    })}
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
    </EuiFormRow>
  );
};
