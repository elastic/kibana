/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { RemoveSeries } from './remove_series';
import { useSeriesStorage } from '../../hooks/use_series_storage';
import { SeriesConfig, SeriesUrl } from '../../types';
import { useDiscoverLink } from '../../hooks/use_discover_link';
import { useAppIndexPatternContext } from '../../hooks/use_app_index_pattern';

interface Props {
  seriesId: number;
  series: SeriesUrl;
  seriesConfig?: SeriesConfig;
  onEditClick?: () => void;
}

export function SeriesActions({ seriesId, series, seriesConfig, onEditClick }: Props) {
  const { setSeries, allSeries } = useSeriesStorage();
  const [isPopoverOpen, setPopover] = useState(false);

  const { href: discoverHref } = useDiscoverLink({ series, seriesConfig });

  const { indexPatterns } = useAppIndexPatternContext();

  const indexPattern = indexPatterns?.[series.dataType];

  const copySeries = () => {
    let copySeriesId: string = `${series.name}-copy`;
    if (allSeries.find(({ name }) => name === copySeriesId)) {
      copySeriesId = copySeriesId + allSeries.length;
    }
    setSeries(allSeries.length, { ...series, name: copySeriesId, breakdown: undefined });
  };

  const toggleSeries = () => {
    if (series.hidden) {
      setSeries(seriesId, { ...series, hidden: undefined });
    } else {
      setSeries(seriesId, { ...series, hidden: true });
    }
  };

  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  const button = <EuiButtonIcon iconType="boxesHorizontal" onClick={onButtonClick} color="text" />;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="none" justifyContent="flexEnd" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={EDIT_SERIES_LABEL}>
          <EuiButtonIcon
            iconType="pencil"
            color="text"
            aria-label={EDIT_SERIES_LABEL}
            size="s"
            onClick={onEditClick}
          />
        </EuiToolTip>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiPopover
          button={button}
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          panelPaddingSize="none"
          anchorPosition="downLeft"
        >
          <EuiContextMenuPanel
            items={[
              <EuiContextMenuItem
                key=""
                icon="discoverApp"
                href={discoverHref}
                aria-label={VIEW_SAMPLE_DOCUMENTS_LABEL}
                disabled={!series.dataType || !series.selectedMetricField || !indexPattern}
                target="_blank"
              >
                {VIEW_SAMPLE_DOCUMENTS_LABEL}
              </EuiContextMenuItem>,
              <EuiContextMenuItem
                key=""
                icon={series.hidden ? 'eyeClosed' : 'eye'}
                onClick={toggleSeries}
                aria-label={HIDE_SERIES_LABEL}
              >
                {HIDE_SERIES_LABEL}
              </EuiContextMenuItem>,
              <EuiContextMenuItem
                key=""
                icon="copy"
                onClick={copySeries}
                aria-label={COPY_SERIES_LABEL}
              >
                {COPY_SERIES_LABEL}
              </EuiContextMenuItem>,
              <RemoveSeries seriesId={seriesId} />,
            ]}
          />
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

const EDIT_SERIES_LABEL = i18n.translate('xpack.observability.seriesEditor.edit', {
  defaultMessage: 'Edit series',
});

const HIDE_SERIES_LABEL = i18n.translate('xpack.observability.seriesEditor.hide', {
  defaultMessage: 'Hide series',
});

const COPY_SERIES_LABEL = i18n.translate('xpack.observability.seriesEditor.clone', {
  defaultMessage: 'Duplicate series',
});

const VIEW_SAMPLE_DOCUMENTS_LABEL = i18n.translate(
  'xpack.observability.seriesEditor.sampleDocuments',
  {
    defaultMessage: 'View sample documents',
  }
);
