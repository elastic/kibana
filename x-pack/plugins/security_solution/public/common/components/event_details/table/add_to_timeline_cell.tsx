/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { isEmpty } from 'lodash';

import { useKibana } from '../../../lib/kibana';
import { AlertSummaryRow } from '../helpers';
import { useActionCellDataProvider } from './use_action_cell_data_provider';

const AddToTimelineCell = React.memo<AlertSummaryRow['description']>(
  ({ data, eventId, fieldFromBrowserField, linkValue, timelineId, values }) => {
    const kibana = useKibana();
    const { timelines } = kibana.services;
    const { getAddToTimelineButton } = timelines.getHoverActions();

    const actionCellConfig = useActionCellDataProvider({
      contextId: timelineId,
      eventId,
      field: data.field,
      fieldFormat: data.format,
      fieldFromBrowserField,
      fieldType: data.type,
      isObjectArray: data.isObjectArray,
      linkValue,
      values,
    });

    const showButton = values != null && !isEmpty(actionCellConfig?.dataProvider);

    if (showButton) {
      return getAddToTimelineButton({
        dataProvider: actionCellConfig?.dataProvider,
        field: data.field,
        ownFocus: true,
      });
    } else {
      return null;
    }
  }
);

AddToTimelineCell.displayName = 'AddToTimelineCell';

export const AddToTimelineCellRenderer = (props: AlertSummaryRow['description']) => (
  <AddToTimelineCell {...props} />
);
