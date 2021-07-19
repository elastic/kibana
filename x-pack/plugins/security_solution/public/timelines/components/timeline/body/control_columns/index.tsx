/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ControlColumnProps } from '../../../../../../common/types/timeline';
import { Actions } from '../actions';
import { HeaderActions } from '../actions/header_actions';

export const defaultControlColumn: ControlColumnProps = {
  id: 'default-timeline-control-column',
  headerCellRender: HeaderActions,
  rowCellRender: Actions,
};
