/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getElasticLogo } from '@kbn/presentation-util-plugin/common/lib';

export const fontStyle = {
  type: 'style',
  spec: {
    fontFamily: 'Chalkboard, serif',
    fontWeight: 'bolder',
    fontStyle: 'normal',
    textDecoration: 'underline',
    color: 'pink',
    textAlign: 'center',
    fontSize: '14px',
    lineHeight: '21px',
  },
  css: 'font-family:Chalkboard, serif;font-weight:bolder;font-style:normal;text-decoration:underline;color:pink;text-align:center;font-size:14px;line-height:21px',
};

export const getContainerStyle = async () => {
  const { elasticLogo } = await getElasticLogo();
  return {
    type: 'containerStyle',
    border: '3px dotted blue',
    borderRadius: '5px',
    padding: '10px',
    backgroundColor: 'red',
    backgroundImage: `url(${elasticLogo})`,
    opacity: 0.5,
    backgroundSize: 'contain',
    backgroundRepeat: 'no-repeat',
  };
};

export const defaultStyle = {
  type: 'seriesStyle',
  label: null,
  color: null,
  lines: 0,
  bars: 0,
  points: 3,
  fill: false,
  stack: undefined,
  horizontalBars: true,
};

export const seriesStyle = {
  type: 'seriesStyle',
  label: 'product1',
  color: 'blue',
  lines: 0,
  bars: 0,
  points: 5,
  fill: true,
  stack: 1,
  horizontalBars: true,
};

export const grayscalePalette = {
  type: 'palette',
  name: 'custom',
  params: {
    colors: ['#FFFFFF', '#888888', '#000000'],
    gradient: false,
  },
};

export const gradientPalette = {
  type: 'palette',
  name: 'custom',
  params: {
    colors: ['#FFFFFF', '#000000'],
    gradient: true,
  },
};

export const xAxisConfig = {
  type: 'axisConfig',
  show: true,
  position: 'top',
};

export const yAxisConfig = {
  type: 'axisConfig',
  show: true,
  position: 'right',
};

export const hideAxis = {
  type: 'axisConfig',
  show: false,
  position: 'right',
};
