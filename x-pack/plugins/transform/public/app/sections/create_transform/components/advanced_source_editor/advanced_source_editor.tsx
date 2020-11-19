/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { EuiCodeEditor } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

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
  return (
    <EuiCodeEditor
      style={{ border: '1px solid #e3e6ef' }}
      mode="json"
      height="250px"
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
      aria-label={i18n.translate('xpack.transform.stepDefineForm.advancedSourceEditorAriaLabel', {
        defaultMessage: 'Advanced query editor',
      })}
    />
  );
};
