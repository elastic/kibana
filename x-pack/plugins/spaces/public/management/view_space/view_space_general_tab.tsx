/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { Space } from '../../../common';
import { CustomizeSpace } from '../edit_space/customize_space';
import { SpaceValidator } from '../lib';

interface Props {
  space: Space;
  isReadOnly: boolean;
}

export const ViewSpaceGeneral: React.FC<Props> = (props) => {
  const onChange = () => {};
  const validator = new SpaceValidator();

  return (
    <CustomizeSpace
      space={props.space}
      onChange={onChange}
      editingExistingSpace={true}
      validator={validator}
    />
  );
};
