/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import { get } from 'lodash/fp';
import React from 'react';

import { RowRendererId } from '../../../../../../../common/types/timeline';

import { RowRenderer, RowRendererContainer } from '../row_renderer';
import { SuricataDetails } from './suricata_details';

export const suricataRowRenderer: RowRenderer = {
  id: RowRendererId.suricata,
  isInstance: (ecs) => {
    const module: string | null | undefined = get('event.module[0]', ecs);
    return module != null && module.toLowerCase() === 'suricata';
  },
  renderRow: ({ browserFields, data, timelineId }) => (
    <RowRendererContainer>
      <SuricataDetails data={data} browserFields={browserFields} timelineId={timelineId} />
    </RowRendererContainer>
  ),
};
