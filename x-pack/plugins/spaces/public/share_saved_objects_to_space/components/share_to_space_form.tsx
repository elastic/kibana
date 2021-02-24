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
import { ShareToSpaceTarget } from '../../types';
import { ShareOptions } from '../types';
import { ShareModeControl } from './share_mode_control';

interface Props {
  spaces: ShareToSpaceTarget[];
  objectNoun: string;
  onUpdate: (shareOptions: ShareOptions) => void;
  shareOptions: ShareOptions;
  showCreateCopyCallout: boolean;
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
    showCreateCopyCallout,
    canShareToAllSpaces,
    makeCopy,
    enableCreateNewSpaceLink,
    enableSpaceAgnosticBehavior,
  } = props;

  const setSelectedSpaceIds = (selectedSpaceIds: string[]) =>
    onUpdate({ ...shareOptions, selectedSpaceIds });

  const createCopyCallout = showCreateCopyCallout ? (
    <Fragment>
      <EuiCallOut
        size="s"
        title={
          <FormattedMessage
            id="xpack.spaces.shareToSpace.shareWarningTitle"
            defaultMessage="Changes are synchronized across spaces"
          />
        }
        color="warning"
      >
        <FormattedMessage
          id="xpack.spaces.shareToSpace.shareWarningBody"
          defaultMessage="Your changes appear in each space you select. {makeACopyLink} if you don't want to synchronize your changes."
          values={{
            makeACopyLink: (
              <EuiLink data-test-subj="sts-copy-link" onClick={() => makeCopy()}>
                <FormattedMessage
                  id="xpack.spaces.shareToSpace.shareWarningLink"
                  defaultMessage="Make a copy"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiCallOut>

      <EuiSpacer size="m" />
    </Fragment>
  ) : null;

  return (
    <div data-test-subj="share-to-space-form">
      {createCopyCallout}

      <ShareModeControl
        spaces={spaces}
        objectNoun={objectNoun}
        canShareToAllSpaces={canShareToAllSpaces}
        shareOptions={shareOptions}
        onChange={(selection) => setSelectedSpaceIds(selection)}
        enableCreateNewSpaceLink={enableCreateNewSpaceLink}
        enableSpaceAgnosticBehavior={enableSpaceAgnosticBehavior}
      />
    </div>
  );
};
