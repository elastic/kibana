/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { EuiCodeEditor, EuiFormRow, EuiLink, EuiPanel } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { useDocumentationLinks } from '../../../../hooks/use_documentation_links';

import { StepDefineFormHook } from '../step_define';

export const AdvancedSourceEditor: FC<StepDefineFormHook> = ({
  searchBar: {
    actions: { setSearchString },
  },
  advancedSourceEditor: {
    actions: { setAdvancedEditorSourceConfig, setAdvancedSourceEditorApplyButtonEnabled },
    state: { advancedEditorSourceConfig, advancedEditorSourceConfigLastApplied },
  },
}) => {
  const { esQueryDsl } = useDocumentationLinks();

  const advancedEditorHelpTextLinkText = i18n.translate(
    'xpack.transform.stepDefineForm.advancedEditorHelpTextLink',
    {
      defaultMessage: 'Learn more about available options.',
    }
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

  return (
    <>
      <EuiFormRow
        label={i18n.translate('xpack.transform.stepDefineForm.advancedSourceEditorLabel', {
          defaultMessage: 'Source query clause',
        })}
        helpText={advancedSourceEditorHelpText}
      >
        <EuiPanel grow={false} paddingSize="none">
          <EuiCodeEditor
            mode="json"
            width="100%"
            value={advancedEditorSourceConfig}
            onChange={(d: string) => {
              setSearchString(undefined);
              setAdvancedEditorSourceConfig(d);

              // Disable the "Apply"-Button if the config hasn't changed.
              if (advancedEditorSourceConfigLastApplied === d) {
                setAdvancedSourceEditorApplyButtonEnabled(false);
                return;
              }

              // Try to parse the string passed on from the editor.
              // If parsing fails, the "Apply"-Button will be disabled
              try {
                JSON.parse(d);
                setAdvancedSourceEditorApplyButtonEnabled(true);
              } catch (e) {
                setAdvancedSourceEditorApplyButtonEnabled(false);
              }
            }}
            setOptions={{
              fontSize: '12px',
            }}
            theme="textmate"
            aria-label={i18n.translate(
              'xpack.transform.stepDefineForm.advancedSourceEditorAriaLabel',
              {
                defaultMessage: 'Advanced query editor',
              }
            )}
          />
        </EuiPanel>
      </EuiFormRow>
    </>
  );
};
