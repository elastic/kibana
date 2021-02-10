/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './share_mode_control.scss';
import React from 'react';
import {
  EuiCallOut,
  EuiCheckableCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { SelectableSpacesControl } from './selectable_spaces_control';
import { ALL_SPACES_ID } from '../../../common/constants';
import { ShareToSpaceTarget } from '../../types';
import { ShareOptions } from '../types';

interface Props {
  spaces: ShareToSpaceTarget[];
  objectNoun: string;
  canShareToAllSpaces: boolean;
  shareOptions: ShareOptions;
  onChange: (selectedSpaceIds: string[]) => void;
  enableCreateNewSpaceLink: boolean;
  enableSpaceAgnosticBehavior: boolean;
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
  const {
    spaces,
    objectNoun,
    canShareToAllSpaces,
    shareOptions,
    onChange,
    enableCreateNewSpaceLink,
    enableSpaceAgnosticBehavior,
  } = props;

  if (spaces.length === 0) {
    return <EuiLoadingSpinner />;
  }

  const { selectedSpaceIds } = shareOptions;
  const isGlobalControlChecked = selectedSpaceIds.includes(ALL_SPACES_ID);
  const shareToAllSpaces = {
    id: 'shareToAllSpaces',
    title: i18n.translate('xpack.spaces.shareToSpace.shareModeControl.shareToAllSpaces.title', {
      defaultMessage: 'All spaces',
    }),
    text: i18n.translate('xpack.spaces.shareToSpace.shareModeControl.shareToAllSpaces.text', {
      defaultMessage: 'Make {objectNoun} available in all current and future spaces.',
      values: { objectNoun },
    }),
    ...(!canShareToAllSpaces && {
      tooltip: isGlobalControlChecked
        ? i18n.translate(
            'xpack.spaces.shareToSpace.shareModeControl.shareToAllSpaces.cannotUncheckTooltip',
            { defaultMessage: 'You need additional privileges to change this option.' }
          )
        : i18n.translate(
            'xpack.spaces.shareToSpace.shareModeControl.shareToAllSpaces.cannotCheckTooltip',
            { defaultMessage: 'You need additional privileges to use this option.' }
          ),
    }),
    disabled: !canShareToAllSpaces,
  };
  const shareToExplicitSpaces = {
    id: 'shareToExplicitSpaces',
    title: i18n.translate(
      'xpack.spaces.shareToSpace.shareModeControl.shareToExplicitSpaces.title',
      { defaultMessage: 'Select spaces' }
    ),
    text: i18n.translate('xpack.spaces.shareToSpace.shareModeControl.shareToExplicitSpaces.text', {
      defaultMessage: 'Make {objectNoun} available in selected spaces only.',
      values: { objectNoun },
    }),
    disabled: !canShareToAllSpaces && isGlobalControlChecked,
  };

  const toggleShareOption = (allSpaces: boolean) => {
    const updatedSpaceIds = allSpaces
      ? [ALL_SPACES_ID, ...selectedSpaceIds]
      : selectedSpaceIds.filter((id) => id !== ALL_SPACES_ID);
    onChange(updatedSpaceIds);
  };

  const getPrivilegeWarning = () => {
    if (!shareToExplicitSpaces.disabled) {
      return null;
    }

    return (
      <>
        <EuiCallOut
          size="s"
          iconType="help"
          title={
            <FormattedMessage
              id="xpack.spaces.shareToSpace.privilegeWarningTitle"
              defaultMessage="Additional privileges required"
            />
          }
          color="warning"
        >
          <FormattedMessage
            id="xpack.spaces.shareToSpace.privilegeWarningBody"
            defaultMessage="To edit the spaces for this {objectNoun}, you need privileges to modify it in all spaces. Contact your system administrator for more information."
            values={{ objectNoun }}
          />
        </EuiCallOut>

        <EuiSpacer size="m" />
      </>
    );
  };

  return (
    <>
      {getPrivilegeWarning()}

      <EuiCheckableCard
        id={shareToExplicitSpaces.id}
        label={createLabel(shareToExplicitSpaces)}
        checked={!isGlobalControlChecked}
        onChange={() => toggleShareOption(false)}
        disabled={shareToExplicitSpaces.disabled}
      >
        <SelectableSpacesControl
          spaces={spaces}
          shareOptions={shareOptions}
          onChange={onChange}
          enableCreateNewSpaceLink={enableCreateNewSpaceLink}
          enableSpaceAgnosticBehavior={enableSpaceAgnosticBehavior}
        />
      </EuiCheckableCard>
      <EuiSpacer size="s" />
      <EuiCheckableCard
        id={shareToAllSpaces.id}
        label={createLabel(shareToAllSpaces)}
        checked={isGlobalControlChecked}
        onChange={() => toggleShareOption(true)}
        disabled={shareToAllSpaces.disabled}
      />
    </>
  );
};
