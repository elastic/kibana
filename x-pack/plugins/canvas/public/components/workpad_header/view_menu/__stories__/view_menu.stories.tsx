import { action } from '@storybook/addon-actions';
import React from 'react';
import { ViewMenu } from '../view_menu.component';

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

export default {
  title: 'components/WorkpadHeader/ViewMenu',
};

export const EditMode = () => (
  <ViewMenu
    isWriteable={true}
    zoomScale={1}
    refreshInterval={0}
    autoplayInterval={0}
    autoplayEnabled={false}
    {...handlers}
  />
);

EditMode.story = {
  name: 'edit mode',
};

export const ReadOnlyMode = () => (
  <ViewMenu
    isWriteable={false}
    zoomScale={1}
    refreshInterval={0}
    autoplayInterval={0}
    autoplayEnabled={false}
    {...handlers}
  />
);

ReadOnlyMode.story = {
  name: 'read only mode',
};

export const WithRefreshEnabled = () => (
  <ViewMenu
    isWriteable={false}
    zoomScale={1}
    refreshInterval={1000}
    autoplayInterval={0}
    autoplayEnabled={false}
    {...handlers}
  />
);

WithRefreshEnabled.story = {
  name: 'with refresh enabled',
};

export const WithAutoplayEnabled = () => (
  <ViewMenu
    isWriteable={false}
    zoomScale={1}
    refreshInterval={0}
    autoplayInterval={5000}
    autoplayEnabled={true}
    {...handlers}
  />
);

WithAutoplayEnabled.story = {
  name: 'with autoplay enabled',
};
