/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataProvider } from '@kbn/timelines-plugin/common';
import { AddToTimelineButtonProps } from '@kbn/timelines-plugin/public';
import { generateDataProvider } from '../utils';
import { fieldAndValueValid, getIndicatorFieldAndValue } from '../../indicators';
import { Indicator } from '../../../../common/types/indicator';

export interface UseAddToTimelineParam {
  /**
   * Indicator used to retrieve the field and value then passed to the Investigate in Timeline logic
   */
  indicator: Indicator | string;
  /**
   * Indicator's field to retrieve indicator's value
   */
  field: string;
}

export interface UseAddToTimelineValue {
  /**
   * Props to pass to the addToTimeline feature.
   */
  addToTimelineProps: AddToTimelineButtonProps | undefined;
}

/**
 * Custom hook that gets an {@link Indicator}, retrieves the field (from the RawIndicatorFieldId.Name)
 * and value, then creates DataProviders used to do the Investigate in Timeline logic
 * (see /kibana/x-pack/plugins/security_solution/public/threat_intelligence/use_investigate_in_timeline.ts)
 */
export const useAddToTimeline = ({
  indicator,
  field,
}: UseAddToTimelineParam): UseAddToTimelineValue => {
  const { key, value } =
    typeof indicator === 'string'
      ? { key: field, value: indicator }
      : getIndicatorFieldAndValue(indicator, field);

  if (!fieldAndValueValid(key, value)) {
    return {} as unknown as UseAddToTimelineValue;
  }

  const dataProvider: DataProvider[] = [generateDataProvider(key, value as string)];

  const addToTimelineProps: AddToTimelineButtonProps = {
    dataProvider,
    field: key,
    ownFocus: false,
  };

  return {
    addToTimelineProps,
  };
};
