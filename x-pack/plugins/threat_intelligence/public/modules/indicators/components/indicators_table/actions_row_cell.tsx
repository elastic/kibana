/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC } from 'react';
import { Indicator } from '../../../../../common/types/Indicator';
import { OpenIndicatorFlyoutButton } from '../open_indicator_flyout_button/open_indicator_flyout_button';

export const ActionsRowCell: VFC<{ indicator: Indicator }> = ({ indicator }) => (
  <OpenIndicatorFlyoutButton indicator={indicator} />
);
