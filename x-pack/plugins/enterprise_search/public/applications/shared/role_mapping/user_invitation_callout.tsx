/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButtonIcon, EuiCopy, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';

import {
  EXISTING_INVITATION_LABEL,
  INVITATION_DESCRIPTION,
  INVITATION_LINK,
  NEW_INVITATION_LABEL,
} from './constants';

interface Props {
  isNew: boolean;
  invitationCode: string;
  urlPrefix: string;
}

export const UserInvitationCallout: React.FC<Props> = ({ isNew, invitationCode, urlPrefix }) => {
  const link = `${urlPrefix}/invitations/${invitationCode}`;
  const label = isNew ? NEW_INVITATION_LABEL : EXISTING_INVITATION_LABEL;

  return (
    <>
      {!isNew && <EuiSpacer />}
      <EuiText size="s">
        <strong>{label}</strong>
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiText size="s">{INVITATION_DESCRIPTION}</EuiText>
      <EuiSpacer size="xs" />
      <EuiLink href={link} target="_blank" external>
        {INVITATION_LINK}
      </EuiLink>{' '}
      <EuiCopy textToCopy={link}>
        {(copy) => <EuiButtonIcon iconType="copy" onClick={copy} />}
      </EuiCopy>
      <EuiSpacer />
    </>
  );
};
