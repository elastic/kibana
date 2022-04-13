/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { CanvasElement, PositionedElement } from '../../../../types';

const timeFormat = 'MM.dd.YYYY HH:mm';

const generatePosition = (n: number): CanvasElement['position'] => ({
  left: n,
  top: n,
  width: n,
  height: n,
  angle: n,
  parent: null,
});

const time1 = {
  from: moment('1.01.2021 8:15', timeFormat).format(),
  to: moment('2.01.2021 17:22', timeFormat).format(),
};
const group1 = 'Group 1';

const time2 = {
  from: moment('1.10.2021 12:20', timeFormat).format(),
  to: moment('2.10.2021 12:33', timeFormat).format(),
};
const group2 = 'Group 2';

export const element: CanvasElement = {
  id: '0',
  position: generatePosition(0),
  type: 'element',
  expression: `filters group="${group2}"`,
  filter: '',
};

const element1: CanvasElement = {
  id: '1',
  position: generatePosition(1),
  type: 'element',
  expression: '',
  filter: `timefilter column="@timestamp" from="${time1.from}" to="${time1.to}" filterGroup="${group1}"`,
};

const element2: CanvasElement = {
  id: '2',
  position: generatePosition(2),
  type: 'element',
  expression: '',
  filter: `exactly value="machine-learning" column="project1" filterGroup="${group2}"`,
};

const element3: CanvasElement = {
  id: '3',
  position: generatePosition(3),
  type: 'element',
  expression: '',
  filter: `timefilter column="@timestamp" from="${time2.from}" to="${time2.to}"`,
};

const element4: CanvasElement = {
  id: '4',
  position: generatePosition(4),
  type: 'element',
  expression: '',
  filter: `exactly value="kibana" column="project2" filterGroup="${group2}"`,
};

export const elementWithGroup: PositionedElement = {
  ...element,
  ast: { type: 'expression', chain: [] },
};

export const elements = [element, element1, element2, element3, element4];
