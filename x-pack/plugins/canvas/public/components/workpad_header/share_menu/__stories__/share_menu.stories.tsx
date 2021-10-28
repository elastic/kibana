/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import React from 'react';
import { reduxDecorator } from '../../../../../storybook';
import { ShareMenu } from '../share_menu.component';

storiesOf('components/WorkpadHeader/ShareMenu', module)
  .addDecorator(reduxDecorator())
  .add('minimal', () => <ShareMenu onExport={action('onExport')} ReportingComponent={null} />);

storiesOf('components/WorkpadHeader/ShareMenu', module).add('with Reporting', () => (
  <ShareMenu
    onExport={action('onExport')}
    ReportingComponent={() => <div>Provided Reporting Component</div>}
  />
));
