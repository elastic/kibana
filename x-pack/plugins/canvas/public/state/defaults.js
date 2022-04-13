/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getId } from '../lib/get_id';
import { DEFAULT_WORKPAD_CSS, DEFAULT_GROUP_BY_FIELD } from '../../common/lib/constants';

export const getDefaultElement = () => {
  return {
    id: getId('element'),
    position: {
      top: 20,
      left: 20,
      height: 300,
      width: 500,
      angle: 0,
      type: 'element',
    },
    expression: `
      demodata
      | pointseries y="median(cost)" x=time color="project"
      | plot defaultStyle={seriesStyle points=5}
    `,
    filter: null,
  };
};

export const getDefaultPage = () => {
  return {
    id: getId('page'),
    style: {
      background: '#FFF',
    },
    transition: {},
    elements: [],
    groups: [],
  };
};

export const getDefaultWorkpad = () => {
  const page = getDefaultPage();
  return {
    name: 'My Canvas Workpad',
    id: getId('workpad'),
    width: 1080,
    height: 720,
    css: DEFAULT_WORKPAD_CSS,
    page: 0,
    pages: [page],
    colors: [
      '#37988d',
      '#c19628',
      '#b83c6f',
      '#3f9939',
      '#1785b0',
      '#ca5f35',
      '#45bdb0',
      '#f2bc33',
      '#e74b8b',
      '#4fbf48',
      '#1ea6dc',
      '#fd7643',
      '#72cec3',
      '#f5cc5d',
      '#ec77a8',
      '#7acf74',
      '#4cbce4',
      '#fd986f',
      '#a1ded7',
      '#f8dd91',
      '#f2a4c5',
      '#a6dfa2',
      '#86d2ed',
      '#fdba9f',
      '#000000',
      '#444444',
      '#777777',
      '#BBBBBB',
      '#FFFFFF',
      'rgba(255,255,255,0)', // 'transparent'
    ],
    variables: [],
    isWriteable: true,
  };
};

export const getExportedWorkpad = () => {
  const workpad = getDefaultWorkpad();
  return {
    id: workpad.id,
    attributes: workpad,
  };
};

export const getDefaultSidebar = () => ({
  groupFiltersByOption: DEFAULT_GROUP_BY_FIELD,
});
