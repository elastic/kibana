/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Indicator } from '@kbn/slo-schema';
import { debounce } from 'lodash';
import { useCallback, useEffect, useState } from 'react';
import { useGetPreviewData } from '../../../hooks/use_get_preview_data';

export function useDebouncedGetPreviewData(
  isIndicatorValid: boolean,
  indicator: Indicator,
  range: { from: Date; to: Date }
) {
  const serializedIndicator = JSON.stringify(indicator);
  const [indicatorState, setIndicatorState] = useState<string>(serializedIndicator);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const store = useCallback(
    debounce((value: string) => setIndicatorState(value), 800),
    []
  );
  useEffect(() => {
    if (indicatorState !== serializedIndicator) {
      store(serializedIndicator);
    }
  }, [indicatorState, serializedIndicator, store]);

  return useGetPreviewData({
    isValid: isIndicatorValid,
    indicator: JSON.parse(indicatorState),
    range,
  });
}
