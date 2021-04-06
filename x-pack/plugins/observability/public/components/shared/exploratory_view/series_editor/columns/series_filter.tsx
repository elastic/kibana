/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useState, Fragment } from 'react';
import {
  EuiButton,
  EuiPopover,
  EuiSpacer,
  EuiButtonEmpty,
  EuiFlexItem,
  EuiFlexGroup,
} from '@elastic/eui';
import { FilterExpanded } from './filter_expanded';
import { DataSeries } from '../../types';
import { FieldLabels } from '../../configurations/constants';
import { SelectedFilters } from '../selected_filters';
import { NEW_SERIES_KEY, useUrlStorage } from '../../hooks/use_url_strorage';

interface Props {
  seriesId: string;
  defaultFilters: DataSeries['defaultFilters'];
  series: DataSeries;
  isNew?: boolean;
}

export interface Field {
  label: string;
  field: string;
  nested?: string;
}

export function SeriesFilter({ series, isNew, seriesId, defaultFilters = [] }: Props) {
  const [isPopoverVisible, setIsPopoverVisible] = useState(false);

  const [selectedField, setSelectedField] = useState<Field | undefined>();

  const options = defaultFilters.map((field) => {
    if (typeof field === 'string') {
      return { label: FieldLabels[field], field };
    }
    return { label: FieldLabels[field.field], field: field.field, nested: field.nested };
  });
  const disabled = seriesId === NEW_SERIES_KEY && !isNew;

  const { setSeries, series: urlSeries } = useUrlStorage(seriesId);

  const button = (
    <EuiButtonEmpty
      flush="left"
      iconType="plus"
      onClick={() => {
        setIsPopoverVisible(true);
      }}
      isDisabled={disabled}
      size="s"
    >
      {i18n.translate('xpack.observability.expView.seriesEditor.addFilter', {
        defaultMessage: 'Add filter',
      })}
    </EuiButtonEmpty>
  );

  const mainPanel = (
    <>
      <EuiSpacer size="s" />
      {options.map((opt) => (
        <Fragment key={opt.label}>
          <EuiButton
            fullWidth={true}
            iconType="arrowRight"
            iconSide="right"
            onClick={() => {
              setSelectedField(opt);
            }}
          >
            {opt.label}
          </EuiButton>
          <EuiSpacer size="s" />
        </Fragment>
      ))}
    </>
  );

  const childPanel = selectedField ? (
    <FilterExpanded
      seriesId={seriesId}
      field={selectedField.field}
      label={selectedField.label}
      nestedField={selectedField.nested}
      goBack={() => {
        setSelectedField(undefined);
      }}
    />
  ) : null;

  const closePopover = () => {
    setIsPopoverVisible(false);
    setSelectedField(undefined);
  };

  return (
    <EuiFlexGroup wrap direction="column" gutterSize="xs" alignItems="flexStart">
      {!disabled && <SelectedFilters seriesId={seriesId} series={series} isNew={isNew} />}
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={button}
          isOpen={isPopoverVisible}
          closePopover={closePopover}
          anchorPosition="leftCenter"
        >
          {!selectedField ? mainPanel : childPanel}
        </EuiPopover>
      </EuiFlexItem>
      {(urlSeries.filters ?? []).length > 0 && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            flush="left"
            color="text"
            iconType="cross"
            onClick={() => {
              setSeries(seriesId, { ...urlSeries, filters: undefined });
            }}
            isDisabled={disabled}
            size="s"
          >
            {i18n.translate('xpack.observability.expView.seriesEditor.clearFilter', {
              defaultMessage: 'Clear filters',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
