/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import type { ApplicationStart } from 'src/core/public';

interface Props {
  application: ApplicationStart;
}

export const NoSpacesAvailable = (props: Props) => {
  const { capabilities, getUrlForApp } = props.application;
  const canCreateNewSpaces = capabilities.spaces.manage;
  if (!canCreateNewSpaces) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued">
        <FormattedMessage
          id="xpack.spaces.shareToSpace.noAvailableSpaces.canCreateNewSpace.text"
          defaultMessage="You can {createANewSpaceLink} for sharing your objects."
          values={{
            createANewSpaceLink: (
              <EuiLink
                data-test-subj="sts-new-space-link"
                href={getUrlForApp('management', { path: 'kibana/spaces/create' })}
              >
                <FormattedMessage
                  id="xpack.spaces.shareToSpace.noAvailableSpaces.canCreateNewSpace.linkText"
                  defaultMessage="create a new space"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiText>
    </>
  );
};
