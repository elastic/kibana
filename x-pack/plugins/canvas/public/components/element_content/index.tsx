/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { getSelectedPage, getPageById, getSelectedElementId } from '../../state/selectors/workpad';
import { useExpressionsService } from '../../services';
import { ElementContent as Component, Props as ComponentProps } from './element_content';
import { State } from '../../../types';

export type Props = Omit<ComponentProps, 'renderFunction' | 'backgroundColor'>;

export const ElementContent = (props: Props) => {
  const expressionsService = useExpressionsService();
  const selectedPageId = useSelector(getSelectedPage);
  const selectedElementId = useSelector(getSelectedElementId);
  const backgroundColor =
    useSelector((state: State) => getPageById(state, selectedPageId)?.style.background) || '';
  const { renderable } = props;

  const renderFunction = renderable ? expressionsService.getRenderer(renderable.as) : null;

  return <Component {...{ ...props, renderFunction, backgroundColor, selectedElementId }} />;
};
