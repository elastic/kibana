/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, FC } from 'react';
import { useSelector } from 'react-redux';
import { canUserWrite } from '../../state/selectors/app';
import { getNodes, getPageById, isWriteable } from '../../state/selectors/workpad';
import { WorkpadRoutingContext } from '../../routes/workpad';
import { StaticPage } from './workpad_static_page';
import { InteractivePage } from './workpad_interactive_page';
import { CommitFn, State, PageTransition } from '../../../types';

export interface WorkpadPageProps {
  pageId: string;
  height: number;
  width: number;
  isSelected: boolean;
  animation?: PageTransition;
  onAnimationEnd?: () => void;
  registerLayout: (commit: CommitFn) => void;
  unregisterLayout: (commit: CommitFn) => void;
}

export const WorkpadPage: FC<WorkpadPageProps> = (props) => {
  const { pageId, isSelected, animation } = props;
  const { isFullscreen } = useContext(WorkpadRoutingContext);
  const propsFromAnimation = animationProps({ animation, isSelected });
  const propsFromState = useSelector((state: State) => ({
    isInteractive: isSelected && !isFullscreen && isWriteable(state) && canUserWrite(state),
    elements: getNodes(state, pageId),
    pageStyle: getPageById(state, pageId)?.style,
  }));

  if (propsFromState.isInteractive) {
    return <InteractivePage {...props} {...propsFromAnimation} {...propsFromState} />;
  }

  return <StaticPage {...props} {...propsFromAnimation} {...propsFromState} />;
};

const animationProps = ({
  animation,
  isSelected,
}: Pick<WorkpadPageProps, 'animation' | 'isSelected'>) =>
  animation
    ? {
        className: animation.name + ' ' + (isSelected ? 'isActive' : 'isInactive'),
        animationStyle: {
          animationDirection: animation.direction,
          animationDuration: '1s', // TODO: Make this configurable
        },
      }
    : { className: isSelected ? 'isActive' : 'isInactive', animationStyle: {} };
