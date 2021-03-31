/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import {
  EuiButton,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiLoadingSpinner,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { useKibana } from '../../../../../../../../../src/plugins/kibana_react/public';
import { ObservabilityPublicPluginsStart } from '../../../../../plugin';
import { useFetcher } from '../../../../..';
import { useUrlStorage } from '../../hooks/use_url_strorage';
import { SeriesType } from '../../../../../../../lens/public';

export function SeriesChartTypes({
  seriesId,
  defaultChartType,
}: {
  seriesId: string;
  defaultChartType: SeriesType;
}) {
  const { series, setSeries, allSeries } = useUrlStorage(seriesId);

  const seriesType = series?.seriesType ?? defaultChartType;

  const onChange = (value: SeriesType) => {
    Object.keys(allSeries).forEach((seriesKey) => {
      const seriesN = allSeries[seriesKey];

      setSeries(seriesKey, { ...seriesN, seriesType: value });
    });
  };

  return (
    <XYChartTypes
      onChange={onChange}
      value={seriesType}
      excludeChartTypes={['bar_percentage_stacked']}
      label={i18n.translate('xpack.observability.expView.chartTypes.label', {
        defaultMessage: 'Chart type',
      })}
    />
  );
}

export interface XYChartTypesProps {
  onChange: (value: SeriesType) => void;
  value: SeriesType;
  label?: string;
  includeChartTypes?: string[];
  excludeChartTypes?: string[];
}

export function XYChartTypes({
  onChange,
  value,
  label,
  includeChartTypes,
  excludeChartTypes,
}: XYChartTypesProps) {
  const [isOpen, setIsOpen] = useState(false);

  const {
    services: { lens },
  } = useKibana<ObservabilityPublicPluginsStart>();

  const { data = [], loading } = useFetcher(() => lens.getXyVisTypes(), [lens]);

  let vizTypes = data ?? [];

  if ((excludeChartTypes ?? []).length > 0) {
    vizTypes = vizTypes.filter(({ id }) => !excludeChartTypes?.includes(id));
  }

  if ((includeChartTypes ?? []).length > 0) {
    vizTypes = vizTypes.filter(({ id }) => includeChartTypes?.includes(id));
  }

  return loading ? (
    <EuiLoadingSpinner />
  ) : (
    <EuiPopover
      isOpen={isOpen}
      anchorPosition="downCenter"
      button={
        label ? (
          <EuiButton
            size="s"
            color="text"
            iconType={vizTypes.find(({ id }) => id === value)?.icon}
            onClick={() => {
              setIsOpen((prevState) => !prevState);
            }}
          >
            {label}
          </EuiButton>
        ) : (
          <EuiButtonIcon
            aria-label={vizTypes.find(({ id }) => id === value)?.label}
            iconType={vizTypes.find(({ id }) => id === value)?.icon!}
            onClick={() => {
              setIsOpen((prevState) => !prevState);
            }}
          />
        )
      }
      closePopover={() => setIsOpen(false)}
    >
      <ButtonGroup
        isIconOnly
        buttonSize="m"
        legend={i18n.translate('xpack.observability.xyChart.chartTypeLegend', {
          defaultMessage: 'Chart type',
        })}
        name="chartType"
        className="eui-displayInlineBlock"
        options={vizTypes.map((t) => ({
          id: t.id,
          label: t.label,
          title: t.label,
          iconType: t.icon || 'empty',
          'data-test-subj': `lnsXY_seriesType-${t.id}`,
        }))}
        idSelected={value}
        onChange={(valueN: string) => {
          onChange(valueN as SeriesType);
        }}
      />
    </EuiPopover>
  );
}

const ButtonGroup = styled(EuiButtonGroup)`
  &&& {
    .euiButtonGroupButton-isSelected {
      background-color: #a5a9b1 !important;
    }
  }
`;
