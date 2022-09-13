/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC } from 'react';
import { DataProvider, QueryOperator } from '@kbn/timelines-plugin/common';
import { AddToTimelineButtonProps } from '@kbn/timelines-plugin/public';
import { EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui/src/components/button';
import { getIndicatorFieldAndValue } from '../../../indicators/lib/field_value';
import { EMPTY_VALUE } from '../../../../../common/constants';
import { useKibana } from '../../../../hooks/use_kibana';
import { Indicator } from '../../../../../common/types/indicator';
import { useStyles } from './styles';

export interface AddToTimelineProps {
  /**
   * Value passed to the timeline. Used in combination with field if is type of {@link Indicator}.
   */
  data: Indicator | string;
  /**
   * Value passed to the timeline.
   */
  field: string;
  /**
   * Only used with `EuiDataGrid` (see {@link AddToTimelineButtonProps}).
   */
  as?: typeof EuiButtonEmpty | typeof EuiButtonIcon;
  /**
   * Used as `data-test-subj` value for e2e tests.
   */
  testId?: string;
}

/**
 * Add to timeline button, used in many places throughout the TI plugin.
 * Support being passed a {@link Indicator} or a string, can be used in a `EuiDataGrid` or as a normal button.
 * Leverages the built-in functionality retrieves from the timeLineService (see ThreatIntelligenceSecuritySolutionContext in x-pack/plugins/threat_intelligence/public/types.ts)
 * Clicking on the button will add a key-value pair to an Untitled timeline.
 *
 * @returns add to timeline button or an empty component.
 */
export const AddToTimeline: VFC<AddToTimelineProps> = ({ data, field, as, testId }) => {
  const styles = useStyles();

  const addToTimelineButton =
    useKibana().services.timelines.getHoverActions().getAddToTimelineButton;

  const { key, value } =
    typeof data === 'string' ? { key: field, value: data } : getIndicatorFieldAndValue(data, field);

  if (!value || value === EMPTY_VALUE || !key) {
    return <></>;
  }

  const operator = ':' as QueryOperator;

  const dataProvider: DataProvider[] = [
    {
      and: [],
      enabled: true,
      id: `timeline-indicator-${key}-${value}`,
      name: value,
      excluded: false,
      kqlQuery: '',
      queryMatch: {
        field: key,
        value,
        operator,
      },
    },
  ];

  const addToTimelineProps: AddToTimelineButtonProps = {
    dataProvider,
    field: key,
    ownFocus: false,
  };
  if (as) addToTimelineProps.Component = as;

  return (
    <div data-test-subj={testId} css={styles.button}>
      {addToTimelineButton(addToTimelineProps)}
    </div>
  );
};
