/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ExpViewActionMenuContent } from './action_menu';
import HeaderMenuPortal from '../../../header_menu_portal';
import { TypedLensByValueInput } from '../../../../../../../lens/public';
import { useExploratoryView } from '../../contexts/exploratory_view_config';

interface Props {
  timeRange?: { from: string; to: string };
  lensAttributes: TypedLensByValueInput['attributes'] | null;
}
export function ExpViewActionMenu(props: Props) {
  const { setHeaderActionMenu, theme$ } = useExploratoryView();

  return (
    <HeaderMenuPortal setHeaderActionMenu={setHeaderActionMenu} theme$={theme$}>
      <ExpViewActionMenuContent {...props} />
    </HeaderMenuPortal>
  );
}
