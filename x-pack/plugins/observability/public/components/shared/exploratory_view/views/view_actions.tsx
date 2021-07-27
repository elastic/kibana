/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSwitch, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEqual } from 'lodash';
import {
  allSeriesKey,
  convertAllShortSeries,
  NEW_SERIES_KEY,
  useSeriesStorage,
} from '../hooks/use_series_storage';
import { SeriesUrl } from '../types';
import { useAppIndexPatternContext } from '../hooks/use_app_index_pattern';
import { BuilderItem, getSeriesToEdit } from '../series_editor/series_editor';
import { DEFAULT_TIME, ReportTypes } from '../configurations/constants';

export function ViewActions() {
  const [editorItems, setEditorItems] = useState<BuilderItem[]>([]);
  const {
    getSeries,
    allSeries,
    setSeries,
    storage,
    reportType,
    autoApply,
    setAutoApply,
    applyChanges,
  } = useSeriesStorage();

  const { loading, indexPatterns } = useAppIndexPatternContext();

  useEffect(() => {
    setEditorItems(getSeriesToEdit({ allSeries, indexPatterns, reportType }));
  }, [allSeries, getSeries, indexPatterns, loading, reportType]);

  const addSeries = () => {
    const prevSeries = allSeries?.[0];
    const name = `${NEW_SERIES_KEY}-${editorItems.length + 1}`;
    const nextSeries = { name } as SeriesUrl;

    const nextSeriesId = allSeries.length;

    if (reportType === 'data-distribution') {
      setSeries(nextSeriesId, {
        ...nextSeries,
        time: prevSeries?.time || DEFAULT_TIME,
      } as SeriesUrl);
    } else {
      setSeries(
        nextSeriesId,
        prevSeries ? nextSeries : ({ ...nextSeries, time: DEFAULT_TIME } as SeriesUrl)
      );
    }
  };

  const noChanges = isEqual(allSeries, convertAllShortSeries(storage.get(allSeriesKey) ?? []));

  const isAddDisabled =
    !reportType ||
    ((reportType === ReportTypes.CORE_WEB_VITAL ||
      reportType === ReportTypes.DEVICE_DISTRIBUTION) &&
      allSeries.length > 0);

  return (
    <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiSwitch
          label={AUTO_APPLY_LABEL}
          checked={autoApply}
          onChange={(e) => setAutoApply(!autoApply)}
          compressed
        />
      </EuiFlexItem>
      {!autoApply && (
        <EuiFlexItem grow={false}>
          <EuiButton onClick={() => applyChanges()} isDisabled={autoApply || noChanges} fill>
            {i18n.translate('xpack.observability.expView.seriesBuilder.apply', {
              defaultMessage: 'Apply changes',
            })}
          </EuiButton>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={
            !reportType
              ? i18n.translate(
                  'xpack.observability.expView.seriesBuilder.addSeries.selectReportType',
                  {
                    defaultMessage: 'Please select report type before you can add series.',
                  }
                )
              : isAddDisabled
              ? i18n.translate('xpack.observability.expView.seriesBuilder.addSeries.limitation', {
                  defaultMessage: 'You can only add one series of this report type.',
                })
              : ''
          }
        >
          <EuiButton color="secondary" onClick={() => addSeries()} isDisabled={isAddDisabled}>
            {i18n.translate('xpack.observability.expView.seriesBuilder.addSeries', {
              defaultMessage: 'Add series',
            })}
          </EuiButton>
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

const AUTO_APPLY_LABEL = i18n.translate('xpack.observability.expView.seriesBuilder.autoApply', {
  defaultMessage: 'Auto apply',
});
