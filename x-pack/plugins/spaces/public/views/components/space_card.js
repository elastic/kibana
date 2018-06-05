/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiCard,
  EuiText,
  EuiAvatar,
  EuiSpacer,
} from '@elastic/eui';
import './space_card.less';

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
      <EuiAvatar size="l" name={space.name} />
      <EuiSpacer size="s" />
      <EuiText className="spaceCardTitle__name"><h3>{space.name}</h3></EuiText>
    </div>
  );
}

function renderSpaceDescription(space) {
  return <span className="spaceCardDescription">{space.description}</span>;
}
