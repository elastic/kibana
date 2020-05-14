/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash';
import React, { memo, FC } from 'react';

import { EuiCodeEditor, EuiFormRow } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { StepDefineFormHook } from '../step_define';

export const AdvancedPivotEditor: FC<StepDefineFormHook['advancedPivotEditor']> = memo(
  ({
    actions: { convertToJson, setAdvancedEditorConfig, setAdvancedPivotEditorApplyButtonEnabled },
    state: { advancedEditorConfigLastApplied, advancedEditorConfig, xJsonMode },
  }) => {
    return (
      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.transform.stepDefineForm.advancedEditorLabel', {
          defaultMessage: 'Pivot configuration object',
        })}
      >
        <EuiCodeEditor
          data-test-subj="transformAdvancedPivotEditor"
          style={{ border: '1px solid #e3e6ef' }}
          height="250px"
          width="100%"
          mode={xJsonMode}
          value={advancedEditorConfig}
          onChange={(d: string) => {
            setAdvancedEditorConfig(d);

            // Disable the "Apply"-Button if the config hasn't changed.
            if (advancedEditorConfigLastApplied === d) {
              setAdvancedPivotEditorApplyButtonEnabled(false);
              return;
            }

            // Try to parse the string passed on from the editor.
            // If parsing fails, the "Apply"-Button will be disabled
            try {
              JSON.parse(convertToJson(d));
              setAdvancedPivotEditorApplyButtonEnabled(true);
            } catch (e) {
              setAdvancedPivotEditorApplyButtonEnabled(false);
            }
          }}
          setOptions={{
            fontSize: '12px',
          }}
          theme="textmate"
          aria-label={i18n.translate('xpack.transform.stepDefineForm.advancedEditorAriaLabel', {
            defaultMessage: 'Advanced pivot editor',
          })}
        />
      </EuiFormRow>
    );
  },
  (prevProps, nextProps) => isEqual(pickProps(prevProps), pickProps(nextProps))
);

function pickProps(props: StepDefineFormHook['advancedPivotEditor']) {
  return [props.state.advancedEditorConfigLastApplied, props.state.advancedEditorConfig];
}
