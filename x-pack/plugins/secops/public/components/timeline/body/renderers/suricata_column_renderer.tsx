/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';
import React from 'react';
import { ColumnRenderer, getSuricataCVEFromSignature } from '.';
import { ECS } from '../../ecs';

const columnsOverriden = ['event'];

export const suricataColumnRenderer: ColumnRenderer = {
  isInstance: (columnName: string, ecs: ECS) =>
    columnsOverriden.includes(columnName) && ecs.event.module.toLowerCase() === 'suricata',

  renderColumn: (columnName: string, data: ECS) => {
    switch (columnName) {
      case 'event':
        const signature = get('suricata.eve.alert.signature', data) as string;
        const cve = getSuricataCVEFromSignature(signature);
        if (cve != null) {
          return <React.Fragment>{cve}</React.Fragment>;
        } else {
          return <React.Fragment>{data.event.id}</React.Fragment>;
        }
      default:
        // unknown column name
        return <React.Fragment>--</React.Fragment>;
    }
  },
};
