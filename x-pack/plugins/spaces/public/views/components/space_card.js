/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiCard,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import './space_card.less';
import {
  SpaceAvatar
} from './space_avatar';

export const SpaceCard = (props) => {
  const {
    space,
    onClick
  } = props;

  return (
    <EuiCard
      className="spaceCard"
      title={renderSpaceTitle(space)}
      description={renderSpaceDescription(space)}
      onClick={onClick}
    />
  );
};

function renderSpaceTitle(space) {
  return (
    <div className="spaceCardTitle">
      <SpaceAvatar space={space} size={"l"} />
      <EuiSpacer size="s" />
      <EuiText className="spaceCardTitle__name"><h3>{space.name}</h3></EuiText>
    </div>
  );
}

function renderSpaceDescription(space) {
  return <span className="spaceCardDescription">{space.description}</span>;
}
