/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, getOr } from 'lodash/fp';
import React from 'react';
import { ColumnRenderer, getSuricataCVEFromSignature } from '.';
import { ECS } from '../../ecs';

const columnsOverriden = ['event'];

export const suricataColumnRenderer: ColumnRenderer = {
  isInstance: (columnName: string, ecs: ECS) => {
    if (
      columnsOverriden.includes(columnName) &&
      ecs &&
      ecs.event &&
      ecs.event.module &&
      ecs.event.module.toLowerCase() === 'suricata'
    ) {
      return true;
    }
    return false;
  },

  renderColumn: (columnName: string, data: ECS) => {
    switch (columnName) {
      case 'event':
        const signature = get('suricata.eve.alert.signature', data) as string;
        const cve = getSuricataCVEFromSignature(signature);
        if (cve != null) {
          return <React.Fragment>{cve}</React.Fragment>;
        } else {
          return <React.Fragment>{getOr('--', 'event.id', data)}</React.Fragment>;
        }
      default:
        // unknown column name
        return <React.Fragment>--</React.Fragment>;
    }
  },
};
