/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { StepDefineFormHook } from '../step_define';

export const AdvancedRuntimeMappingsEditorSwitch: FC<
  StepDefineFormHook['runtimeMappingsEditor']
> = (props) => {
  const {
    actions: { setRuntimeMappingsUpdated, toggleRuntimeMappingsEditor },
    state: { isRuntimeMappingsEditorEnabled },
  } = props;

  // If switching to KQL after updating via editor - reset search
  const toggleEditorHandler = (reset = false) => {
    if (reset === true) {
      setRuntimeMappingsUpdated(false);
    }
    toggleRuntimeMappingsEditor(reset);
  };

  return (
    <EuiSwitch
      label={i18n.translate(
        'xpack.transform.stepDefineForm.advancedEditorRuntimeMappingsSwitchLabel',
        {
          defaultMessage: 'Edit runtime mappings',
        }
      )}
      checked={isRuntimeMappingsEditorEnabled}
      onChange={() => toggleEditorHandler()}
      data-test-subj="transformAdvancedRuntimeMappingsEditorSwitch"
    />
  );
};
