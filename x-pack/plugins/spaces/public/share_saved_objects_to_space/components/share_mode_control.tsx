/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './share_mode_control.scss';
import React from 'react';
import {
  EuiCheckableCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormFieldset,
  EuiIconTip,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SelectableSpacesControl } from './selectable_spaces_control';
import { ALL_SPACES_ID } from '../../../common/constants';
import { SpaceTarget } from '../types';

interface Props {
  spaces: SpaceTarget[];
  canShareToAllSpaces: boolean;
  selectedSpaceIds: string[];
  onChange: (selectedSpaceIds: string[]) => void;
  disabled?: boolean;
}

function createLabel({
  title,
  text,
  disabled,
  tooltip,
}: {
  title: string;
  text: string;
  disabled: boolean;
  tooltip?: string;
}) {
  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiText>{title}</EuiText>
        </EuiFlexItem>
        {tooltip && (
          <EuiFlexItem grow={false}>
            <EuiIconTip content={tooltip} position="left" type="iInCircle" />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiText color={disabled ? undefined : 'subdued'} size="s">
        {text}
      </EuiText>
    </>
  );
}

export const ShareModeControl = (props: Props) => {
  const { spaces, canShareToAllSpaces, selectedSpaceIds, onChange } = props;

  if (spaces.length === 0) {
    return <EuiLoadingSpinner />;
  }

  const isGlobalControlChecked = selectedSpaceIds.includes(ALL_SPACES_ID);
  const shareToAllSpaces = {
    id: 'shareToAllSpaces',
    title: i18n.translate(
      'xpack.spaces.management.shareToSpace.shareModeControl.shareToAllSpaces.title',
      { defaultMessage: 'All spaces' }
    ),
    text: i18n.translate(
      'xpack.spaces.management.shareToSpace.shareModeControl.shareToAllSpaces.text',
      { defaultMessage: 'Make object available in all current and future spaces.' }
    ),
    ...(!canShareToAllSpaces && {
      tooltip: isGlobalControlChecked
        ? i18n.translate(
            'xpack.spaces.management.shareToSpace.shareModeControl.shareToAllSpaces.cannotUncheckTooltip',
            { defaultMessage: 'You need additional privileges to change this option.' }
          )
        : i18n.translate(
            'xpack.spaces.management.shareToSpace.shareModeControl.shareToAllSpaces.cannotCheckTooltip',
            { defaultMessage: 'You need additional privileges to use this option.' }
          ),
    }),
    disabled: !canShareToAllSpaces,
  };
  const shareToExplicitSpaces = {
    id: 'shareToExplicitSpaces',
    title: i18n.translate(
      'xpack.spaces.management.shareToSpace.shareModeControl.shareToExplicitSpaces.title',
      { defaultMessage: 'Select spaces' }
    ),
    text: i18n.translate(
      'xpack.spaces.management.shareToSpace.shareModeControl.shareToExplicitSpaces.text',
      { defaultMessage: 'Make object available in selected spaces only.' }
    ),
    disabled: !canShareToAllSpaces && isGlobalControlChecked,
  };
  const shareOptionsTitle = i18n.translate(
    'xpack.spaces.management.shareToSpace.shareModeControl.shareOptionsTitle',
    { defaultMessage: 'Share options' }
  );

  const toggleShareOption = (allSpaces: boolean) => {
    const updatedSpaceIds = allSpaces
      ? [ALL_SPACES_ID, ...selectedSpaceIds]
      : selectedSpaceIds.filter((id) => id !== ALL_SPACES_ID);
    onChange(updatedSpaceIds);
  };

  return (
    <>
      <EuiFormFieldset
        legend={{
          children: (
            <EuiTitle size="xs">
              <span>{shareOptionsTitle}</span>
            </EuiTitle>
          ),
        }}
      >
        <EuiCheckableCard
          id={shareToExplicitSpaces.id}
          label={createLabel(shareToExplicitSpaces)}
          checked={!isGlobalControlChecked}
          onChange={() => toggleShareOption(false)}
          disabled={shareToExplicitSpaces.disabled}
        >
          <SelectableSpacesControl {...props} />
        </EuiCheckableCard>
        <EuiSpacer size="s" />
        <EuiCheckableCard
          id={shareToAllSpaces.id}
          label={createLabel(shareToAllSpaces)}
          checked={isGlobalControlChecked}
          onChange={() => toggleShareOption(true)}
          disabled={shareToAllSpaces.disabled}
        />
      </EuiFormFieldset>
    </>
  );
};
