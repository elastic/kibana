/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './share_to_space_form.scss';
import React, { Fragment } from 'react';
import { EuiSpacer, EuiCallOut, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { ShareOptions, SpaceTarget } from '../types';
import { ShareModeControl } from './share_mode_control';

interface Props {
  spaces: SpaceTarget[];
  objectNoun: string;
  onUpdate: (shareOptions: ShareOptions) => void;
  shareOptions: ShareOptions;
  showShareWarning: boolean;
  canShareToAllSpaces: boolean;
  makeCopy: () => void;
  enableCreateNewSpaceLink: boolean;
  enableSpaceAgnosticBehavior: boolean;
}

export const ShareToSpaceForm = (props: Props) => {
  const {
    spaces,
    objectNoun,
    onUpdate,
    shareOptions,
    showShareWarning,
    canShareToAllSpaces,
    makeCopy,
    enableCreateNewSpaceLink,
    enableSpaceAgnosticBehavior,
  } = props;

  const setSelectedSpaceIds = (selectedSpaceIds: string[]) =>
    onUpdate({ ...shareOptions, selectedSpaceIds });

  const getShareWarning = () => {
    if (!showShareWarning) {
      return null;
    }

    return (
      <Fragment>
        <EuiCallOut
          size="s"
          title={
            <FormattedMessage
              id="xpack.spaces.management.shareToSpace.shareWarningTitle"
              defaultMessage="Changes will be synchronized across spaces"
            />
          }
          color="warning"
        >
          <FormattedMessage
            id="xpack.spaces.management.shareToSpace.shareWarningBody"
            defaultMessage="If you choose multiple spaces for this {objectNoun}, any changes will affect it in each space. If you don't want this to happen, {makeACopyLink} instead."
            values={{
              objectNoun,
              makeACopyLink: (
                <EuiLink data-test-subj="sts-copy-link" onClick={() => makeCopy()}>
                  <FormattedMessage
                    id="xpack.spaces.management.shareToSpace.shareWarningLink"
                    defaultMessage="make a copy"
                  />
                </EuiLink>
              ),
            }}
          />
        </EuiCallOut>

        <EuiSpacer size="m" />
      </Fragment>
    );
  };

  return (
    <div data-test-subj="share-to-space-form">
      {getShareWarning()}

      <ShareModeControl
        spaces={spaces}
        objectNoun={objectNoun}
        canShareToAllSpaces={canShareToAllSpaces}
        selectedSpaceIds={shareOptions.selectedSpaceIds}
        onChange={(selection) => setSelectedSpaceIds(selection)}
        enableCreateNewSpaceLink={enableCreateNewSpaceLink}
        enableSpaceAgnosticBehavior={enableSpaceAgnosticBehavior}
      />
    </div>
  );
};
