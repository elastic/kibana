/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { storiesOf } from '@storybook/react';
import React from 'react';
import { PaletteSwatch } from '../palette_swatch';

import { paulTor14, paulTor21, canvas } from '../../../../common/lib/palettes';

storiesOf('components/Color/PaletteSwatch', module).add('default', () => (
  <>
    <PaletteSwatch palette={paulTor14} />
    <PaletteSwatch palette={paulTor21} />
    <PaletteSwatch palette={canvas} />
  </>
));
