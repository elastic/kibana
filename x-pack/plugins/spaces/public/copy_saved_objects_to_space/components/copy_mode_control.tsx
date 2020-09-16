/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import {
  EuiFormFieldset,
  EuiTitle,
  EuiCheckableCard,
  EuiRadioGroup,
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface CopyModeControlProps {
  initialValues: CopyMode;
  updateSelection: (result: CopyMode) => void;
}

export interface CopyMode {
  createNewCopies: boolean;
  overwrite: boolean;
}

const createNewCopiesDisabled = {
  id: 'createNewCopiesDisabled',
  text: i18n.translate(
    'xpack.spaces.management.copyToSpace.copyModeControl.createNewCopies.disabledTitle',
    { defaultMessage: 'Check for existing objects' }
  ),
  tooltip: i18n.translate(
    'xpack.spaces.management.copyToSpace.copyModeControl.createNewCopies.disabledText',
    {
      defaultMessage: 'Check if objects were previously copied or imported into the space.',
    }
  ),
};
const createNewCopiesEnabled = {
  id: 'createNewCopiesEnabled',
  text: i18n.translate(
    'xpack.spaces.management.copyToSpace.copyModeControl.createNewCopies.enabledTitle',
    { defaultMessage: 'Create new objects with random IDs' }
  ),
  tooltip: i18n.translate(
    'xpack.spaces.management.copyToSpace.copyModeControl.createNewCopies.enabledText',
    {
      defaultMessage:
        'Use this option to create one or more copies of the object in the same space.',
    }
  ),
};
const overwriteEnabled = {
  id: 'overwriteEnabled',
  label: i18n.translate(
    'xpack.spaces.management.copyToSpace.copyModeControl.overwrite.enabledLabel',
    { defaultMessage: 'Automatically overwrite conflicts' }
  ),
};
const overwriteDisabled = {
  id: 'overwriteDisabled',
  label: i18n.translate(
    'xpack.spaces.management.copyToSpace.copyModeControl.overwrite.disabledLabel',
    { defaultMessage: 'Request action on conflict' }
  ),
};
const includeRelated = {
  id: 'includeRelated',
  text: i18n.translate('xpack.spaces.management.copyToSpace.copyModeControl.includeRelated.title', {
    defaultMessage: 'Include related objects',
  }),
  tooltip: i18n.translate(
    'xpack.spaces.management.copyToSpace.copyModeControl.includeRelated.text',
    {
      defaultMessage:
        'Copy this object and its related objects. For dashboards, related visualizations, index patterns, and saved searches are also copied.',
    }
  ),
};
const copyOptionsTitle = i18n.translate(
  'xpack.spaces.management.copyToSpace.copyModeControl.copyOptionsTitle',
  { defaultMessage: 'Copy options' }
);
const relationshipOptionsTitle = i18n.translate(
  'xpack.spaces.management.copyToSpace.copyModeControl.relationshipOptionsTitle',
  { defaultMessage: 'Relationship' }
);

const createLabel = ({ text, tooltip }: { text: string; tooltip: string }) => (
  <EuiFlexGroup>
    <EuiFlexItem>
      <EuiText>{text}</EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiIconTip content={tooltip} position="left" type="iInCircle" />
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const CopyModeControl = ({ initialValues, updateSelection }: CopyModeControlProps) => {
  const [createNewCopies, setCreateNewCopies] = useState(initialValues.createNewCopies);
  const [overwrite, setOverwrite] = useState(initialValues.overwrite);

  const onChange = (partial: Partial<CopyMode>) => {
    if (partial.createNewCopies !== undefined) {
      setCreateNewCopies(partial.createNewCopies);
    } else if (partial.overwrite !== undefined) {
      setOverwrite(partial.overwrite);
    }
    updateSelection({ createNewCopies, overwrite, ...partial });
  };

  return (
    <>
      <EuiFormFieldset
        legend={{
          children: (
            <EuiTitle size="xs">
              <span>{copyOptionsTitle}</span>
            </EuiTitle>
          ),
        }}
      >
        <EuiCheckableCard
          id={createNewCopiesDisabled.id}
          label={createLabel(createNewCopiesDisabled)}
          checked={!createNewCopies}
          onChange={() => onChange({ createNewCopies: false })}
        >
          <EuiRadioGroup
            options={[overwriteEnabled, overwriteDisabled]}
            idSelected={overwrite ? overwriteEnabled.id : overwriteDisabled.id}
            onChange={(id: string) => onChange({ overwrite: id === overwriteEnabled.id })}
            disabled={createNewCopies}
            data-test-subj={'cts-copyModeControl-overwriteRadioGroup'}
          />
        </EuiCheckableCard>

        <EuiSpacer size="s" />

        <EuiCheckableCard
          id={createNewCopiesEnabled.id}
          label={createLabel(createNewCopiesEnabled)}
          checked={createNewCopies}
          onChange={() => onChange({ createNewCopies: true })}
        />
      </EuiFormFieldset>

      <EuiSpacer size="m" />

      <EuiFormFieldset
        legend={{
          children: (
            <EuiTitle size="xs">
              <span>{relationshipOptionsTitle}</span>
            </EuiTitle>
          ),
        }}
      >
        <EuiCheckableCard
          id={includeRelated.id}
          label={createLabel(includeRelated)}
          checkableType="checkbox"
          checked={true}
          onChange={() => {}} // noop
          disabled
        />
      </EuiFormFieldset>
    </>
  );
};
