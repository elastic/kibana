import React from 'react';
import { action } from '@storybook/addon-actions';
import { PaletteArgInput } from '../palette';
import { paulTor14 } from '../../../../common/lib/palettes';

export default {
  title: 'arguments/Palette',
};

export const Default = {
  render: () => (
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
        typeInstance={{}}
      />
    </div>
  ),

  name: 'default',
};
