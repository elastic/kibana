/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// @ts-nocheck

import {
  // FIXME: need updated typedefs
  // @ts-ignore
  EuiCard,
} from '@elastic/eui';
import React from 'react';
import { Space } from '../../../common/model/space';
import { SpaceAvatar } from '../../components';

interface Props {
  space: Space;
  onClick: () => void;
}
export const SpaceCard = (props: Props) => {
  const { space, onClick } = props;

  return (
    <EuiCard
      className="spaceCard"
      data-test-subj={`space-card-${space.id}`}
      icon={renderSpaceAvatar(space)}
      title={space.name}
      description={renderSpaceDescription(space)}
      onClick={onClick}
    />
  );
};

function renderSpaceAvatar(space: Space) {
  return <SpaceAvatar space={space} size={'l'} />;
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
