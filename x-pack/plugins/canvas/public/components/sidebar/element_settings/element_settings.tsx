/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import deepEqual from 'react-fast-compare';
import { useSelector } from 'react-redux';
import { getElementById, getSelectedPage } from '../../../state/selectors/workpad';
import { ElementSettings as Component } from './element_settings.component';
import { State } from '../../../../types';

interface Props {
  selectedElementId: string | null;
}

export const ElementSettings: React.FC<Props> = ({ selectedElementId }) => {
  const element = useSelector((state: State) => {
    return getElementById(state, selectedElementId, getSelectedPage(state));
  }, deepEqual);

  if (element) {
    return <Component element={element} />;
  }

  return null;
};
