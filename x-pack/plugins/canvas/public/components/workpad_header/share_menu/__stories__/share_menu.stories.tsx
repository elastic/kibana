/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import React from 'react';
import { ShareMenu } from '../share_menu.component';

storiesOf('components/WorkpadHeader/ShareMenu', module).add('default', () => (
  <ShareMenu
    includeReporting={true}
    onCopy={action('onCopy')}
    onExport={action('onExport')}
    getExportUrl={(type: string) => {
      action(`getExportUrl('${type}')`);
      return type;
    }}
  />
));
