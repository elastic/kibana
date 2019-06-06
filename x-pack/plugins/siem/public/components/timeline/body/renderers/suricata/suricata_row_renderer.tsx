/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';
import React from 'react';

import { RowRenderer, RowRendererContainer } from '../row_renderer';
import { Row } from '../helpers';
import { SuricataDetails } from './suricata_details';

export const suricataRowRenderer: RowRenderer = {
  isInstance: ecs => {
    const module: string | null | undefined = get('event.module[0]', ecs);
    return module != null && module.toLowerCase() === 'suricata';
  },
  renderRow: ({ browserFields, data, width, children }) => {
    return (
      <Row>
        {children}
        <RowRendererContainer width={width}>
          <SuricataDetails data={data} browserFields={browserFields} />
        </RowRendererContainer>
      </Row>
    );
  },
};
