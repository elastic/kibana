/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SeriesIdentifier } from '@elastic/charts';
import { omit } from 'lodash';
import { useState } from 'react';
import {
  getDurationFormatter,
  TimeFormatter,
} from '../../../../../common/utils/formatters';
import { TimeSeries } from '../../../../../typings/timeseries';
import { getMaxY } from './helper';

export const useFormatter = (
  series?: TimeSeries[]
): {
  formatter: TimeFormatter;
  toggleSerie: (disabledSerie: SeriesIdentifier) => void;
} => {
  const [disabledSeries, setDisabledSeries] = useState<
    Record<SeriesIdentifier['specId'], 0>
  >({});

  const visibleSeries = series?.filter(
    (serie) => disabledSeries[serie.title] === undefined
  );

  const maxY = getMaxY(visibleSeries || series || []);
  const formatter = getDurationFormatter(maxY);

  const toggleSerie = ({ specId }: SeriesIdentifier) => {
    if (disabledSeries[specId] !== undefined) {
      setDisabledSeries((prevState) => {
        return omit(prevState, specId);
      });
    } else {
      setDisabledSeries((prevState) => {
        return { ...prevState, [specId]: 0 };
      });
    }
  };

  return {
    formatter,
    toggleSerie,
  };
};
