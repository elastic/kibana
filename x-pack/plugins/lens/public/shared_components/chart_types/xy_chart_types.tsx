/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton, EuiButtonGroup, EuiButtonIcon, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import styled from 'styled-components';
import { visualizationTypes } from '../../xy_visualization/types';

const ButtonGroup = styled(EuiButtonGroup)`
  &&& {
    .euiButtonGroupButton-isSelected {
      background-color: #a5a9b1 !important;
    }
  }
`;
export interface XYChartTypesProps {
  onChange: (value: string) => void;
  value: string;
  label?: string;
  includeChartTypes?: string[];
  excludeChartTypes?: string[];
}

function XYChartTypes({
  onChange,
  value,
  label,
  includeChartTypes,
  excludeChartTypes,
}: XYChartTypesProps) {
  const [isOpen, setIsOpen] = useState(false);

  let vizTypes = visualizationTypes;

  if ((excludeChartTypes ?? []).length > 0) {
    vizTypes = visualizationTypes.filter(({ id }) => !excludeChartTypes?.includes(id));
  }

  if ((includeChartTypes ?? []).length > 0) {
    vizTypes = visualizationTypes.filter(({ id }) => includeChartTypes?.includes(id));
  }

  return (
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
        legend={i18n.translate('xpack.lens.xyChart.chartTypeLegend', {
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
          onChange(valueN);
        }}
      />
    </EuiPopover>
  );
}

// eslint-disable-next-line import/no-default-export
export default XYChartTypes;
