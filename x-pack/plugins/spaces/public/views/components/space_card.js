/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiCard,
  EuiTextColor,
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
      icon={renderSpaceAvatar(space)}
      title={space.name}
      description={renderSpaceDescription(space)}
      onClick={onClick}
    />
  );
};

function renderSpaceAvatar(space) {
  return <SpaceAvatar space={space} size={"l"} />;
}

function renderSpaceDescription(space) {
  let description = space.description;
  const needsTruncation = space.description.length > 120;
  if (needsTruncation) {
    description = (
      <span title={description}>{space.description.substr(0, 120) + '…'}</span>
    );
  }
  return <EuiTextColor className="eui-textBreakWord" color={"subdued"}>{description}</EuiTextColor>;
}
