/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useSelector } from 'react-redux';

import { canUserWrite as canUserWriteSelector } from '../../state/selectors/app';
import type { State } from '../../../types';

import { useCreateWorkpad } from './hooks';
import { WorkpadCreate as Component, Props as ComponentProps } from './workpad_create.component';

type Props = Omit<ComponentProps, 'canUserWrite' | 'onClick'>;

export const WorkpadCreate = (props: Props) => {
  const createWorkpad = useCreateWorkpad();

  const { canUserWrite } = useSelector((state: State) => ({
    canUserWrite: canUserWriteSelector(state),
  }));

  const onClick: ComponentProps['onClick'] = async () => {
    await createWorkpad();
  };

  return <Component {...{ ...props, onClick, canUserWrite }} />;
};
