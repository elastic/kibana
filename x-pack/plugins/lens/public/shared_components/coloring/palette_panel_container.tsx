/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { StackedPanelProps, StackedPanelContainer } from '../stacked_panel_container';

export function PalettePanelContainer(props: Omit<StackedPanelProps, 'title' | 'idPrefix'>) {
  return (
    <StackedPanelContainer
      {...props}
      title={i18n.translate('xpack.lens.table.palettePanelTitle', {
        defaultMessage: 'Edit color',
      })}
      idPrefix={'PalettePanel'}
    />
  );
}
