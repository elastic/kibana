/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { Home } from '../home';
import { setDocTitle } from '../../lib/doc_title';

export interface Props {
  onLoad: () => void;
}

export const HomeApp: FC<Props> = ({ onLoad = () => {} }) => {
  onLoad();
  setDocTitle('Canvas');
  return <Home />;
};
