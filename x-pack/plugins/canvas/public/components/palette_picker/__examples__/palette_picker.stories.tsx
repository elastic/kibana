/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import React from 'react';
import { PalettePicker } from '../palette_picker';

import { paulTor14 } from '../../../../common/lib/palettes';

storiesOf('components/Color/PalettePicker', module).add('default', () => (
  <div className="canvasContainerWrapper" style={{ width: '200px' }}>
    <PalettePicker palette={paulTor14} ariaLabel="palette picker" onChange={action('onChange')} />
  </div>
));
