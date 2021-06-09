/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';
import { Query, IndexPattern, TimefilterContract } from 'src/plugins/data/public';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { setFullTimeRange } from './full_time_range_selector_service';
import { useDataVisualizerKibana } from '../../../kibana_context';

interface Props {
  timefilter: TimefilterContract;
  indexPattern: IndexPattern;
  disabled: boolean;
  query?: Query;
  callback?: (a: any) => void;
}

// Component for rendering a button which automatically sets the range of the time filter
// to the time range of data in the index(es) mapped to the supplied Kibana index pattern or query.
export const FullTimeRangeSelector: FC<Props> = ({
  timefilter,
  indexPattern,
  query,
  disabled,
  callback,
}) => {
  const {
    services: {
      notifications: { toasts },
    },
  } = useDataVisualizerKibana();

  // wrapper around setFullTimeRange to allow for the calling of the optional callBack prop
  async function setRange(i: IndexPattern, q?: Query) {
    try {
      const fullTimeRange = await setFullTimeRange(timefilter, i, q);
      if (typeof callback === 'function') {
        callback(fullTimeRange);
      }
    } catch (e) {
      toasts.addDanger(
        i18n.translate(
          'xpack.dataVisualizer.index.fullTimeRangeSelector.errorSettingTimeRangeNotification',
          {
            defaultMessage: 'An error occurred setting the time range.',
          }
        )
      );
    }
  }
  return (
    <EuiButton
      isDisabled={disabled}
      onClick={() => setRange(indexPattern, query)}
      data-test-subj="dataVisualizerButtonUseFullData"
    >
      <FormattedMessage
        id="xpack.dataVisualizer.index.fullTimeRangeSelector.useFullDataButtonLabel"
        defaultMessage="Use full {indexPatternTitle} data"
        values={{
          indexPatternTitle: indexPattern.title,
        }}
      />
    </EuiButton>
  );
};
