/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';
import { ColumnHeaderOptions } from '../../../../../../common/types';

import { BrowserFields } from '../../../../../common/containers/source';
import { DEFAULT_COLUMN_MIN_WIDTH, DEFAULT_DATE_COLUMN_MIN_WIDTH } from '../constants';

/** Enriches the column headers with field details from the specified browserFields */
export const getColumnHeaders = (
  headers: ColumnHeaderOptions[],
  browserFields: BrowserFields
): ColumnHeaderOptions[] => {
  return headers
    ? headers.map((header) => {
        const splitHeader = header.id.split('.'); // source.geo.city_name -> [source, geo, city_name]

        return {
          ...header,
          ...get(
            [splitHeader.length > 1 ? splitHeader[0] : 'base', 'fields', header.id],
            browserFields
          ),
        };
      })
    : [];
};

export const getColumnWidthFromType = (type: string): number =>
  type !== 'date' ? DEFAULT_COLUMN_MIN_WIDTH : DEFAULT_DATE_COLUMN_MIN_WIDTH;
