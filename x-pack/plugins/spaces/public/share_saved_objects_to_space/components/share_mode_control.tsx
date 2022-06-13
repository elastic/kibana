/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonGroup,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { ALL_SPACES_ID } from '../../../common/constants';
import { useSpaces } from '../../spaces_context';
import type { SpacesDataEntry } from '../../types';
import type { ShareOptions } from '../types';
import { SelectableSpacesControl } from './selectable_spaces_control';

interface Props {
  spaces: SpacesDataEntry[];
  objectNoun: string;
  canShareToAllSpaces: boolean;
  shareOptions: ShareOptions;
  onChange: (selectedSpaceIds: string[]) => void;
  enableCreateNewSpaceLink: boolean;
  enableSpaceAgnosticBehavior: boolean;
}

const buttonGroupLegend = i18n.translate(
  'xpack.spaces.shareToSpace.shareModeControl.buttonGroupLegend',
  { defaultMessage: 'Choose how this is shared' }
);

const shareToAllSpacesId = 'shareToAllSpacesId';
const shareToAllSpacesButtonLabel = i18n.translate(
  'xpack.spaces.shareToSpace.shareModeControl.shareToAllSpaces.buttonLabel',
  { defaultMessage: 'All spaces' }
);

const shareToExplicitSpacesId = 'shareToExplicitSpacesId';
const shareToExplicitSpacesButtonLabel = i18n.translate(
  'xpack.spaces.shareToSpace.shareModeControl.shareToExplicitSpaces.buttonLabel',
  { defaultMessage: 'Select spaces' }
);

const cannotChangeTooltip = i18n.translate(
  'xpack.spaces.shareToSpace.shareModeControl.shareToAllSpaces.cannotChangeTooltip',
  { defaultMessage: 'You need additional privileges to change this option.' }
);

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
  const { services } = useSpaces();
  const { docLinks } = services;

  if (spaces.length === 0) {
    return <EuiLoadingSpinner />;
  }

  const { selectedSpaceIds } = shareOptions;
  const isGlobalControlChecked = selectedSpaceIds.includes(ALL_SPACES_ID);

  const getPrivilegeWarning = () => {
    if (canShareToAllSpaces || !isGlobalControlChecked) {
      return null;
    }

    const docLink = docLinks?.links.security.kibanaPrivileges;
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
            defaultMessage="To edit the spaces for this {objectNoun}, you need {readAndWritePrivilegesLink} in all spaces."
            values={{
              objectNoun,
              readAndWritePrivilegesLink: (
                <EuiLink href={docLink} target="_blank">
                  <FormattedMessage
                    id="xpack.spaces.shareToSpace.privilegeWarningLink"
                    defaultMessage="read and write privileges"
                  />
                </EuiLink>
              ),
            }}
          />
        </EuiCallOut>

        <EuiSpacer size="m" />
      </>
    );
  };

  return (
    <>
      {getPrivilegeWarning()}

      <EuiButtonGroup
        type="single"
        idSelected={isGlobalControlChecked ? shareToAllSpacesId : shareToExplicitSpacesId}
        options={[
          { id: shareToExplicitSpacesId, label: shareToExplicitSpacesButtonLabel },
          { id: shareToAllSpacesId, label: shareToAllSpacesButtonLabel },
        ]}
        onChange={(optionId: string) => {
          const updatedSpaceIds =
            optionId === shareToAllSpacesId
              ? [ALL_SPACES_ID, ...selectedSpaceIds]
              : selectedSpaceIds.filter((id) => id !== ALL_SPACES_ID);
          onChange(updatedSpaceIds);
        }}
        legend={buttonGroupLegend}
        color="success"
        isFullWidth={true}
        isDisabled={!canShareToAllSpaces}
      />

      <EuiSpacer size="s" />

      <EuiFlexItem grow={false}>
        <EuiFlexGroup responsive={false}>
          <EuiFlexItem>
            <EuiText
              color="subdued"
              textAlign="center"
              size="s"
              data-test-subj="share-mode-control-description"
            >
              {isGlobalControlChecked
                ? i18n.translate(
                    'xpack.spaces.shareToSpace.shareModeControl.shareToAllSpaces.text',
                    {
                      defaultMessage:
                        'Make {objectNoun} available in all current and future spaces.',
                      values: { objectNoun },
                    }
                  )
                : i18n.translate(
                    'xpack.spaces.shareToSpace.shareModeControl.shareToExplicitSpaces.text',
                    {
                      defaultMessage: 'Make {objectNoun} available in selected spaces only.',
                      values: { objectNoun },
                    }
                  )}
            </EuiText>
          </EuiFlexItem>
          {!canShareToAllSpaces && (
            <EuiFlexItem grow={false}>
              <EuiIconTip content={cannotChangeTooltip} position="left" type="iInCircle" />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiSpacer size="m" />

      <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
        <SelectableSpacesControl
          spaces={spaces}
          shareOptions={shareOptions}
          onChange={onChange}
          enableCreateNewSpaceLink={enableCreateNewSpaceLink}
          enableSpaceAgnosticBehavior={enableSpaceAgnosticBehavior}
        />
      </EuiFlexGroup>
    </>
  );
};
