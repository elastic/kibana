/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './share_to_space_form.scss';
import React, { Fragment } from 'react';
import { EuiHorizontalRule, EuiCallOut, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { ShareOptions, SpaceTarget } from '../types';
import { ShareModeControl } from './share_mode_control';

interface Props {
  spaces: SpaceTarget[];
  onUpdate: (shareOptions: ShareOptions) => void;
  shareOptions: ShareOptions;
  showShareWarning: boolean;
  canShareToAllSpaces: boolean;
  makeCopy: () => void;
}

export const ShareToSpaceForm = (props: Props) => {
  const { spaces, onUpdate, shareOptions, showShareWarning, canShareToAllSpaces, makeCopy } = props;

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
              defaultMessage="Editing a shared object applies the changes in every space"
            />
          }
          color="warning"
        >
          <FormattedMessage
            id="xpack.spaces.management.shareToSpace.shareWarningBody"
            defaultMessage="To edit in only one space, {makeACopyLink} instead."
            values={{
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

        <EuiHorizontalRule margin="m" />
      </Fragment>
    );
  };

  return (
    <div data-test-subj="share-to-space-form">
      {getShareWarning()}

      <ShareModeControl
        spaces={spaces}
        canShareToAllSpaces={canShareToAllSpaces}
        selectedSpaceIds={shareOptions.selectedSpaceIds}
        onChange={(selection) => setSelectedSpaceIds(selection)}
      />
    </div>
  );
};
