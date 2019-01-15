/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';
import React from 'react';

import { ColumnRenderer, getSuricataCVEFromSignature } from '.';
import { Ecs } from '../../../../graphql/types';
import { getEmptyValue, getOrEmpty } from '../../../empty_value';

const suricataColumnsOverridden = ['event.id'];

export const suricataColumnRenderer: ColumnRenderer = {
  isInstance: (columnName: string, ecs: Ecs) => {
    if (
      suricataColumnsOverridden.includes(columnName) &&
      ecs &&
      ecs.event &&
      ecs.event.module &&
      ecs.event.module.toLowerCase() === 'suricata'
    ) {
      return true;
    }
    return false;
  },

  renderColumn: (columnName: string, data: Ecs) => {
    switch (columnName) {
      case 'event.id':
        const signature = get('suricata.eve.alert.signature', data) as string;
        const cve = getSuricataCVEFromSignature(signature);
        if (cve != null) {
          return <>{cve}</>;
        } else {
          return <>{getOrEmpty('event.id', data)}</>;
        }
      default:
        // unknown column name
        return <>{getEmptyValue()}</>;
    }
  },
};
