/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import React from 'react';
import { ViewMenu } from '../view_menu';

const handlers = {
  setZoomScale: action('setZoomScale'),
  zoomIn: action('zoomIn'),
  zoomOut: action('zoomOut'),
  toggleWriteable: action('toggleWriteable'),
  resetZoom: action('resetZoom'),
  enterFullscreen: action('enterFullscreen'),
  doRefresh: action('doRefresh'),
  fitToWindow: action('fitToWindow'),
  setRefreshInterval: action('setRefreshInterval'),
  setAutoplayInterval: action('setAutoplayInterval'),
  enableAutoplay: action('enableAutoplay'),
};

storiesOf('components/WorkpadHeader/ViewMenu', module)
  .add('edit mode', () => (
    <ViewMenu
      isWriteable={true}
      zoomScale={1}
      refreshInterval={0}
      autoplayInterval={0}
      autoplayEnabled={false}
      {...handlers}
    />
  ))
  .add('read only mode', () => (
    <ViewMenu
      isWriteable={false}
      zoomScale={1}
      refreshInterval={0}
      autoplayInterval={0}
      autoplayEnabled={false}
      {...handlers}
    />
  ))
  .add('with refresh enabled', () => (
    <ViewMenu
      isWriteable={false}
      zoomScale={1}
      refreshInterval={1000}
      autoplayInterval={0}
      autoplayEnabled={false}
      {...handlers}
    />
  ))
  .add('with autoplay enabled', () => (
    <ViewMenu
      isWriteable={false}
      zoomScale={1}
      refreshInterval={0}
      autoplayInterval={5000}
      autoplayEnabled={true}
      {...handlers}
    />
  ));
