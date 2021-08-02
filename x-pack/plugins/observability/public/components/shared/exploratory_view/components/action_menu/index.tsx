/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ExpViewActionMenuContent } from './action_menu';
import HeaderMenuPortal from '../../../header_menu_portal';
import { usePluginContext } from '../../../../../hooks/use_plugin_context';
import { TypedLensByValueInput } from '../../../../../../../lens/public';

interface Props {
  timeRange?: { from: string; to: string };
  lensAttributes: TypedLensByValueInput['attributes'] | null;
}
export function ExpViewActionMenu(props: Props) {
  const { appMountParameters } = usePluginContext();

  return (
    <HeaderMenuPortal setHeaderActionMenu={appMountParameters.setHeaderActionMenu}>
      <ExpViewActionMenuContent {...props} />
    </HeaderMenuPortal>
  );
}
