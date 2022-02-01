/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useRef } from 'react';

import { EuiToolTip, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SeriesUrl, BuilderItem } from '../types';
import { getSeriesToEdit } from '../series_editor/series_editor';
import { NEW_SERIES_KEY, useSeriesStorage } from '../hooks/use_series_storage';
import { useAppDataViewContext } from '../hooks/use_app_data_view';
import { DEFAULT_TIME, ReportTypes } from '../configurations/constants';
import { useExploratoryView } from '../contexts/exploratory_view_config';

export function AddSeriesButton() {
  const [editorItems, setEditorItems] = useState<BuilderItem[]>([]);
  const addSeriesButtonRef = useRef<HTMLButtonElement>(null);
  const { getSeries, allSeries, setSeries, reportType } = useSeriesStorage();

  const { loading, dataViews } = useAppDataViewContext();

  const { reportConfigMap } = useExploratoryView();

  useEffect(() => {
    setEditorItems(getSeriesToEdit({ allSeries, dataViews, reportType, reportConfigMap }));
  }, [allSeries, getSeries, dataViews, loading, reportConfigMap, reportType]);

  const addSeries = () => {
    const prevSeries = allSeries?.[0];
    const name = `${NEW_SERIES_KEY}-${editorItems.length + 1}`;
    const nextSeries = { name } as SeriesUrl;
    if (addSeriesButtonRef?.current) {
      addSeriesButtonRef.current.blur();
    }

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

  const isAddDisabled =
    !reportType ||
    ((reportType === ReportTypes.CORE_WEB_VITAL ||
      reportType === ReportTypes.DEVICE_DISTRIBUTION) &&
      allSeries.length > 0);

  return (
    <EuiToolTip
      content={
        !reportType
          ? i18n.translate('xpack.observability.expView.seriesBuilder.addSeries.selectReportType', {
              defaultMessage: 'Please select report type before you can add series.',
            })
          : isAddDisabled
          ? i18n.translate('xpack.observability.expView.seriesBuilder.addSeries.limitation', {
              defaultMessage: 'You can only add one series of this report type.',
            })
          : ''
      }
    >
      <EuiButton
        onClick={() => addSeries()}
        isDisabled={isAddDisabled}
        iconType="plusInCircle"
        size="s"
        buttonRef={addSeriesButtonRef}
      >
        {i18n.translate('xpack.observability.expView.seriesBuilder.addSeries', {
          defaultMessage: 'Add series',
        })}
      </EuiButton>
    </EuiToolTip>
  );
}
