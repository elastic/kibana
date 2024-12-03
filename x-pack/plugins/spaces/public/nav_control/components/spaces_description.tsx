/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './spaces_description.scss';

import { EuiContextMenuPanel, EuiText } from '@elastic/eui';
import type { FC } from 'react';
import React from 'react';

import type { ApplicationStart, Capabilities } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

import { ManageSpacesButton } from './manage_spaces_button';
import { getSpacesFeatureDescription } from '../../constants';

interface Props {
  id: string;
  isLoading: boolean;
  onClickManageSpaceBtn: () => void;
  capabilities: Capabilities;
  navigateToApp: ApplicationStart['navigateToApp'];
}

export const SpacesDescription: FC<Props> = (props: Props) => {
  const panelProps = {
    id: props.id,
    className: 'spcDescription',
    title: 'Spaces',
  };

  const spacesLoadingMessage = i18n.translate('xpack.spaces.navControl.loadingMessage', {
    defaultMessage: 'Loading...',
  });

  return (
    <EuiContextMenuPanel {...panelProps}>
      <EuiText className="spcDescription__text">
        <p>{props.isLoading ? spacesLoadingMessage : getSpacesFeatureDescription()}</p>
      </EuiText>
      <div key="manageSpacesButton" className="spcDescription__manageButtonWrapper">
        <ManageSpacesButton
          size="s"
          style={{ width: `100%` }}
          onClick={props.onClickManageSpaceBtn}
          capabilities={props.capabilities}
          navigateToApp={props.navigateToApp}
        />
      </div>
    </EuiContextMenuPanel>
  );
};
