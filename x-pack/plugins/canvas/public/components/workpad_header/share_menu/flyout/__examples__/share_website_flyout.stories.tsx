/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import React from 'react';
import { ShareWebsiteFlyout } from '../share_website_flyout';

storiesOf('components/WorkpadHeader/ShareMenu/ShareWebsiteFlyout', module)
  .addParameters({
    info: {
      inline: true,
      styles: {
        infoBody: {
          margin: 20,
        },
        infoStory: {
          margin: '20px 30px',
          width: '620px',
        },
      },
    },
  })
  .add('default', () => (
    <ShareWebsiteFlyout
      onCopy={action('onCopy')}
      onDownload={action('onDownload')}
      onClose={action('onClose')}
    />
  ))
  .add('unsupported renderers', () => (
    <ShareWebsiteFlyout
      onCopy={action('onCopy')}
      onDownload={action('onDownload')}
      onClose={action('onClose')}
      unsupportedRenderers={['rendererOne', 'rendererTwo']}
    />
  ));
