/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { storiesOf } from '@storybook/react';
import React, { CSSProperties } from 'react';
import { Metric } from '../metric';

const labelFontSpec: CSSProperties = {
  fontFamily: "Baskerville, Georgia, Garamond, 'Times New Roman', Times, serif",
  fontWeight: 'normal',
  fontStyle: 'italic',
  textDecoration: 'none',
  textAlign: 'center',
  fontSize: '24px',
  lineHeight: '1',
  color: '#000000',
};

const metricFontSpec: CSSProperties = {
  fontFamily:
    "Optima, 'Lucida Grande', 'Lucida Sans Unicode', Verdana, Helvetica, Arial, sans-serif",
  fontWeight: 'bold',
  fontStyle: 'normal',
  textDecoration: 'none',
  textAlign: 'center',
  fontSize: '48px',
  lineHeight: '1',
  color: '#b83c6f',
};

storiesOf('renderers/Metric', module)
  .addDecorator(story => (
    <div
      style={{
        width: '200px',
      }}
    >
      {story()}
    </div>
  ))
  .add('with null metric', () => <Metric metric={null} metricFont={{}} labelFont={{}} />)
  .add('with number metric', () => (
    <Metric metric="12345.6789" labelFont={{}} metricFont={metricFontSpec} />
  ))
  .add('with string metric', () => (
    <Metric metric="$12.34" labelFont={labelFontSpec} metricFont={metricFontSpec} />
  ))
  .add('with label', () => (
    <Metric
      label="Average price"
      metric="$12.34"
      labelFont={labelFontSpec}
      metricFont={metricFontSpec}
    />
  ))
  .add('with number metric and a specified format', () => (
    <Metric
      metric="-0.0024"
      labelFont={labelFontSpec}
      metricFont={metricFontSpec}
      metricFormat="0.00%"
    />
  ))
  .add('with formatted string metric and a specified format', () => (
    <Metric
      label="Total Revenue"
      metric="$10000000.00"
      labelFont={labelFontSpec}
      metricFont={metricFontSpec}
      metricFormat="$0a"
    />
  ))
  .add('with invalid metricFont', () => (
    <Metric
      label="Total Revenue"
      metric="$10000000.00"
      labelFont={labelFontSpec}
      metricFont={metricFontSpec}
      metricFormat="$0a"
    />
  ));
