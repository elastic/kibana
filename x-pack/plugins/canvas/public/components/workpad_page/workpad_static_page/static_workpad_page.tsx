/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';
import { simplePositioning } from '../positioning_utils';
import { StaticWorkpadPage } from './static_workpad_page.component';
import { WorkpadPageProps } from '../workpad_page';
import { CanvasNode } from '../../../../types';

interface Props extends WorkpadPageProps {
  elements: CanvasNode[];
  className: string;
  animationStyle: Record<string, any>;
}

export const StaticPage: FC<Props> = ({ elements, ...rest }) => {
  const positioning = useMemo(() => simplePositioning({ elements }), [elements]);
  return <StaticWorkpadPage {...rest} {...positioning} />;
};
