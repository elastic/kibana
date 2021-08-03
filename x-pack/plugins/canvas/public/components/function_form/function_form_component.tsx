/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { RenderArgData } from '../../expression_types/types';

type FunctionFormComponentProps = RenderArgData;

export const FunctionFormComponent: FunctionComponent<FunctionFormComponentProps> = (props) => (
  <div className="canvasFunctionForm">{props.expressionType.render(props)}</div>
);
