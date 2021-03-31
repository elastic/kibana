/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiToken } from '@elastic/eui';

import { BOOST_TYPE_TO_ICON_MAP } from './constants';
import { BoostType } from './types';

interface Props {
  type: BoostType;
}

export const BoostIcon: React.FC<Props> = ({ type }) => {
  return (
    <EuiToken
      iconType={BOOST_TYPE_TO_ICON_MAP[type]}
      size="m"
      shape="square"
      color="euiColorVis1"
    />
  );
};
