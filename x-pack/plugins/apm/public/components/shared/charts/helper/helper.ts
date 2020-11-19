/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { XYBrushArea } from '@elastic/charts';
import { History } from 'history';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { asDecimal, tpmUnit } from '../../../../../common/utils/formatters';
import { Coordinate } from '../../../../../typings/timeseries';
import { isValidCoordinateValue } from '../../../../utils/isValidCoordinateValue';
import { fromQuery, toQuery } from '../../Links/url_helpers';

function getTPMFormatter(t: number, transactionType?: string) {
  return `${asDecimal(t)} ${tpmUnit(transactionType)}`;
}

export function getTPMTooltipFormatter(transactionType?: string) {
  return (y: Coordinate['y']) =>
    isValidCoordinateValue(y)
      ? getTPMFormatter(y, transactionType)
      : NOT_AVAILABLE_LABEL;
}

export const onBrushEnd = ({
  x,
  history,
}: {
  x: XYBrushArea['x'];
  history: History;
}) => {
  if (x) {
    const start = x[0];
    const end = x[1];

    const currentSearch = toQuery(history.location.search);
    const nextSearch = {
      rangeFrom: new Date(start).toISOString(),
      rangeTo: new Date(end).toISOString(),
    };
    history.push({
      ...history.location,
      search: fromQuery({
        ...currentSearch,
        ...nextSearch,
      }),
    });
  }
};
