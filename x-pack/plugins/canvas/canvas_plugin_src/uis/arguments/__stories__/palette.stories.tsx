/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import React from 'react';
import { action } from '@storybook/addon-actions';
import { PaletteArgInput } from '../palette';
import { paulTor14 } from '../../../../common/lib/palettes';

storiesOf('arguments/Palette', module).add('default', () => (
  <div className="canvasContainerWrapper" style={{ width: '200px' }}>
    <PaletteArgInput
      argValue={{
        type: 'expression',
        chain: [
          {
            arguments: {
              _: paulTor14.colors,
              gradient: [paulTor14.gradient],
            },
            function: 'palette',
            type: 'function',
          },
        ],
      }}
      onValueChange={action('onValueChange')}
      renderError={action('renderError')}
    />
  </div>
));
