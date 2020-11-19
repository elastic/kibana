/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './space_card.scss';
import { EuiCard } from '@elastic/eui';
import React from 'react';
import { addSpaceIdToPath, ENTER_SPACE_PATH } from '../../../common';
import { SpaceAvatar } from '../../space_avatar';
import { Space } from '../..';

interface Props {
  space: Space;
  serverBasePath: string;
}
export const SpaceCard = (props: Props) => {
  const { serverBasePath, space } = props;

  return (
    <EuiCard
      className="spaceCard"
      data-test-subj={`space-card-${space.id}`}
      icon={renderSpaceAvatar(space)}
      title={space.name}
      description={renderSpaceDescription(space)}
      href={addSpaceIdToPath(serverBasePath, space.id, ENTER_SPACE_PATH)}
    />
  );
};

function renderSpaceAvatar(space: Space) {
  // not announcing space name here because the title of the EuiCard that the SpaceAvatar lives in is already
  // announcing it. See https://github.com/elastic/kibana/issues/27748
  return <SpaceAvatar space={space} size={'l'} announceSpaceName={false} />;
}

function renderSpaceDescription(space: Space) {
  let description: JSX.Element | string = space.description || '';
  const needsTruncation = description.length > 120;
  if (needsTruncation) {
    description = description.substr(0, 120) + '…';
  }

  return (
    <span title={description} className="eui-textBreakWord euiTextColor--subdued">
      {description}
    </span>
  );
}
