/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import React from 'react';
import { platformService } from '../../../../services/stubs/platform';
import { reportingService } from '../../../../services/stubs/reporting';
import { ShareMenu } from '../share_menu.component';

storiesOf('components/WorkpadHeader/ShareMenu', module).add('minimal', () => (
  <ShareMenu
    sharingData={{
      workpad: { id: 'coolworkpad', name: 'Workpad of Cool', height: 10, width: 7 },
      pageCount: 11,
    }}
    sharingServices={{ basePath: platformService.getBasePathInterface() }}
    onExport={action('onExport')}
  />
));

storiesOf('components/WorkpadHeader/ShareMenu', module).add('with Reporting', () => (
  <ShareMenu
    sharingData={{
      workpad: { id: 'coolworkpad', name: 'Workpad of Cool', height: 10, width: 7 },
      pageCount: 11,
    }}
    sharingServices={{
      basePath: platformService.getBasePathInterface(),
      reporting: reportingService.start,
    }}
    onExport={action('onExport')}
  />
));
