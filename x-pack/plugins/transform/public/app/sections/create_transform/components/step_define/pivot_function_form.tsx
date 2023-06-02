/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

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

import { useDocumentationLinks } from '../../../../hooks/use_documentation_links';

import { AdvancedPivotEditor } from '../advanced_pivot_editor';
import { AdvancedPivotEditorSwitch } from '../advanced_pivot_editor_switch';
import { PivotConfiguration } from '../pivot_configuration';

import type { StepDefineFormHook } from './hooks/use_step_define_form';

const advancedEditorsSidebarWidth = '220px';

interface PivotFunctionFormProps {
  applyPivotChangesHandler: () => void;
  copyToClipboardPivot: string;
  copyToClipboardPivotDescription: string;
  stepDefineForm: StepDefineFormHook;
}

export const PivotFunctionForm: FC<PivotFunctionFormProps> = ({
  applyPivotChangesHandler,
  copyToClipboardPivot,
  copyToClipboardPivotDescription,
  stepDefineForm,
}) => {
  const { esTransformPivot } = useDocumentationLinks();

  const { isAdvancedPivotEditorEnabled, isAdvancedPivotEditorApplyButtonEnabled } =
    stepDefineForm.advancedPivotEditor.state;

  return (
    <EuiFlexGroup justifyContent="spaceBetween">
      {/* Flex Column #1: Pivot Config Form / Advanced Pivot Config Editor */}
      <EuiFlexItem>
        {!isAdvancedPivotEditorEnabled && <PivotConfiguration {...stepDefineForm.pivotConfig} />}
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
                    {i18n.translate('xpack.transform.stepDefineForm.advancedEditorHelpTextLink', {
                      defaultMessage: 'Learn more about available options.',
                    })}
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
                {i18n.translate('xpack.transform.stepDefineForm.advancedEditorApplyButtonText', {
                  defaultMessage: 'Apply changes',
                })}
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
