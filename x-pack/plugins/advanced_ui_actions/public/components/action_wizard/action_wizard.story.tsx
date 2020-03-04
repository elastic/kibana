/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';

import { storiesOf } from '@storybook/react';
import { ActionWizard } from './action_wizard';
import { ACTION_FACTORIES } from './test_data';

function Demo() {
  const [state, setState] = useState();

  return (
    <>
      <ActionWizard
        actionFactories={ACTION_FACTORIES}
        onChange={(factory, config) => {
          setState({
            factory,
            config,
          });
        }}
      />
      <div style={{ marginTop: '44px' }} />
      <hr />
      <div>Action Factory Type: {state?.factory?.type}</div>
      <div>Action Factory Config: {JSON.stringify(state?.config)}</div>
    </>
  );
}

storiesOf('components/ActionWizard', module)
  .add('default', () => <Demo />)
  .add('Long list of action factories', () => (
    // to make sure layout doesn't break
    <ActionWizard
      actionFactories={[
        ...ACTION_FACTORIES,
        ...ACTION_FACTORIES,
        ...ACTION_FACTORIES,
        ...ACTION_FACTORIES,
      ]}
      onChange={() => {}}
    />
  ));
