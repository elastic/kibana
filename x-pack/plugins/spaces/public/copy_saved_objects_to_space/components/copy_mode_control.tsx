/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, Fragment } from 'react';
import { EuiRadioGroup, EuiText, EuiSwitchEvent, EuiSwitch, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface CopyModeControlProps {
  initialValues: CopyMode;
  updateSelection: (result: CopyMode) => void;
}

export interface CopyMode {
  createNewCopies: boolean;
  overwrite: boolean;
}

export const CopyModeControl = ({ initialValues, updateSelection }: CopyModeControlProps) => {
  const [createNewCopies, setCreateNewCopies] = useState(initialValues.createNewCopies);
  const [overwrite, setOverwrite] = useState(initialValues.overwrite);

  const disabledOption = {
    id: 'createNewCopiesDisabled',
    title: i18n.translate(
      'xpack.spaces.management.copyToSpace.copyModeControl.createNewCopies.disabledTitle',
      { defaultMessage: 'Check for conflicts' }
    ),
    text: i18n.translate(
      'xpack.spaces.management.copyToSpace.copyModeControl.createNewCopies.disabledText',
      { defaultMessage: 'Check each copied object for similar origin IDs in the destination space' }
    ),
  };
  const enabledOption = {
    id: 'createNewCopiesEnabled',
    title: i18n.translate(
      'xpack.spaces.management.copyToSpace.copyModeControl.createNewCopies.enabledTitle',
      { defaultMessage: 'Add as copies' }
    ),
    text: i18n.translate(
      'xpack.spaces.management.copyToSpace.copyModeControl.createNewCopies.enabledText',
      { defaultMessage: 'All copied objects will be created with new random IDs' }
    ),
  };
  const createLabel = ({ title, text }: { title: string; text: string }) => (
    <Fragment>
      <EuiText>{title}</EuiText>
      <EuiSpacer size="xs" />
      <EuiText color="subdued">{text}</EuiText>
    </Fragment>
  );

  const onChange = (partial: Partial<CopyMode>) => {
    if (partial.createNewCopies !== undefined) {
      setCreateNewCopies(partial.createNewCopies);
    } else if (partial.overwrite !== undefined) {
      setOverwrite(partial.overwrite);
    }
    updateSelection({ createNewCopies, overwrite, ...partial });
  };

  const switchLabel = i18n.translate(
    'xpack.spaces.management.copyToSpace.copyModeControl.overwriteSwitch',
    { defaultMessage: 'Automatically try to overwrite conflicts?' }
  );

  return (
    <EuiRadioGroup
      options={[
        {
          id: disabledOption.id,
          label: (
            <Fragment>
              {createLabel(disabledOption)}
              <EuiSpacer size="xs" />
              <EuiSwitch
                label={switchLabel}
                compressed={true}
                checked={overwrite}
                disabled={createNewCopies}
                onChange={({ target: { checked } }: EuiSwitchEvent) =>
                  onChange({ overwrite: checked })
                }
                data-test-subj={'cts-copy-mode-overwrite-switch'}
              />
              <EuiSpacer size="m" />
            </Fragment>
          ),
        },
        { id: enabledOption.id, label: createLabel(enabledOption) },
      ]}
      idSelected={createNewCopies ? enabledOption.id : disabledOption.id}
      onChange={(id: string) => onChange({ createNewCopies: id === enabledOption.id })}
      data-test-subj={'cts-copy-mode-radio'}
    />
  );
};
