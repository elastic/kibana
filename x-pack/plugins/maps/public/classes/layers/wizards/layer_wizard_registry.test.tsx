/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { getLayerWizards, registerLayerWizard } from './layer_wizard_registry';
import { LAYER_WIZARD_CATEGORY } from '../../../../common/constants';

describe('LayerWizardRegistryTest', () => {
  it('should enforce ordering', async () => {
    registerLayerWizard({
      categories: [LAYER_WIZARD_CATEGORY.REFERENCE],
      description: '',
      icon: '',
      title: 'foobar',
      renderWizard(): React.ReactElement<any> {
        return <></>;
      },
    });

    registerLayerWizard({
      categories: [LAYER_WIZARD_CATEGORY.REFERENCE],
      description: '',
      icon: '',
      title: 'foo',
      renderWizard(): React.ReactElement<any> {
        return <></>;
      },
      order: 1,
    });

    registerLayerWizard({
      categories: [LAYER_WIZARD_CATEGORY.REFERENCE],
      description: '',
      icon: '',
      title: 'bar',
      renderWizard(): React.ReactElement<any> {
        return <></>;
      },
    });

    const wizards = await getLayerWizards();

    expect(wizards[0].title).toBe('foobar');
    expect(wizards[1].title).toBe('bar');
    expect(wizards[2].title).toBe('foo');
  });
});
