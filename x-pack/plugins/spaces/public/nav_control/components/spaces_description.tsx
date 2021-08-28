/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuPanel, EuiText } from '@elastic/eui';
import type { FC } from 'react';
import React from 'react';

import type { ApplicationStart } from '../../../../../../src/core/public/application/types';
import type { Capabilities } from '../../../../../../src/core/types/capabilities';
import { getSpacesFeatureDescription } from '../../constants';
import { ManageSpacesButton } from './manage_spaces_button';
import './spaces_description.scss';

interface Props {
  id: string;
  onManageSpacesClick: () => void;
  capabilities: Capabilities;
  navigateToApp: ApplicationStart['navigateToApp'];
}

export const SpacesDescription: FC<Props> = (props: Props) => {
  const panelProps = {
    id: props.id,
    className: 'spcDescription',
    title: 'Spaces',
  };

  return (
    <EuiContextMenuPanel {...panelProps}>
      <EuiText className="spcDescription__text">
        <p>{getSpacesFeatureDescription()}</p>
      </EuiText>
      <div key="manageSpacesButton" className="spcDescription__manageButtonWrapper">
        <ManageSpacesButton
          size="s"
          style={{ width: `100%` }}
          onClick={props.onManageSpacesClick}
          capabilities={props.capabilities}
          navigateToApp={props.navigateToApp}
        />
      </div>
    </EuiContextMenuPanel>
  );
};
