/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import React, { memo, FC } from 'react';

import { EuiCodeEditor } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { isRuntimeMappings } from '../../../../../../common/shared_imports';

import { StepDefineFormHook } from '../step_define';

export const AdvancedRuntimeMappingsEditor: FC<StepDefineFormHook['runtimeMappingsEditor']> = memo(
  ({
    actions: {
      convertToJson,
      setAdvancedRuntimeMappingsConfig,
      setRuntimeMappingsEditorApplyButtonEnabled,
    },
    state: { advancedEditorRuntimeMappingsLastApplied, advancedRuntimeMappingsConfig, xJsonMode },
  }) => {
    return (
      <EuiCodeEditor
        data-test-subj="transformAdvancedRuntimeMappingsEditor"
        style={{ border: '1px solid #e3e6ef' }}
        height="250px"
        width="100%"
        mode={xJsonMode}
        value={advancedRuntimeMappingsConfig}
        onChange={(d: string) => {
          setAdvancedRuntimeMappingsConfig(d);

          // Disable the "Apply"-Button if the config hasn't changed.
          if (advancedEditorRuntimeMappingsLastApplied === d) {
            setRuntimeMappingsEditorApplyButtonEnabled(false);
            return;
          }

          // Try to parse the string passed on from the editor.
          // If parsing fails, the "Apply"-Button will be disabled
          try {
            // if the user deletes the json in the editor
            // they should still be able to apply changes
            const isEmptyStr = d === '';
            const parsedJson = isEmptyStr ? {} : JSON.parse(convertToJson(d));
            setRuntimeMappingsEditorApplyButtonEnabled(isEmptyStr || isRuntimeMappings(parsedJson));
          } catch (e) {
            setRuntimeMappingsEditorApplyButtonEnabled(false);
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
    );
  },
  (prevProps, nextProps) => isEqual(pickProps(prevProps), pickProps(nextProps))
);

function pickProps(props: StepDefineFormHook['runtimeMappingsEditor']) {
  return [
    props.state.advancedEditorRuntimeMappingsLastApplied,
    props.state.advancedRuntimeMappingsConfig,
  ];
}
