/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect, useState } from 'react';

import { EuiRange, htmlIdGenerator, EuiPopover, EuiButton } from '@elastic/eui';
import styled from 'styled-components';
import { useHistory } from 'react-router-dom';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { fromQuery, toQuery } from '../../../shared/Links/url_helpers';

const PercentileRange = styled(EuiRange)`
  &&& {
    button::before {
      content: '';
      display: block;
      position: absolute;
      z-index: 1;
      top: 0;
      bottom: 0;
      border: 1px dotted;
      border-width: 0 0 0 1px;
      height: 12px;
      width: 2px;
    }
  }
`;

const ticks = [
  { label: '40', value: 40 },
  { label: 'Median (P50)', value: 50 },
  { label: 'P75', value: 75 },
  { label: 'P90', value: 90 },
  { label: 'P95', value: 95 },
  { label: 'P99', value: 99 },
];

const DEFAULT_P = 50;

export function UserPercentile() {
  const history = useHistory();

  const {
    urlParams: { percentile },
  } = useUrlParams();

  const [value, setValue] = useState(percentile ?? DEFAULT_P);

  const updatePercentile = useCallback(
    (percentileN?: number) => {
      const newLocation = {
        ...history.location,
        search: fromQuery({
          ...toQuery(history.location.search),
          percentile: percentileN,
        }),
      };
      history.push(newLocation);
    },
    [history]
  );

  useEffect(() => {
    if (!percentile) {
      updatePercentile(DEFAULT_P);
    }
  }, []);

  useEffect(() => {
    setValue(Number(percentile));
  }, [percentile]);

  const onChange = (e) => {
    const val = +e.currentTarget.value;
    if (val < 62.5) {
      setValue(50);
    }
    if (val > 62.5 && val < 82.5) {
      setValue(75);
    }
    if (val < 92.5 && val > 82.5) {
      setValue(90);
    }
    if (val > 92.5 && val < 97) {
      setValue(95);
    }
    if (val > 97) {
      setValue(99);
    }
  };

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onButtonClick = () => {
    // setOptions(options.slice().sort(Comparators.property('checked')));
    setIsPopoverOpen(!isPopoverOpen);
  };

  const closePopover = () => {
    setIsPopoverOpen(false);
    updatePercentile(value);
  };
  return (
    <>
      <EuiPopover
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        button={
          <EuiButton
            iconType="arrowDown"
            iconSide="right"
            onClick={onButtonClick}
            color={'text'}
            contentProps={{ style: { justifyContent: 'space-around' } }}
          >
            {ticks.find((tick) => tick.value == percentile)?.label}
          </EuiButton>
        }
      >
        <PercentileRange
          style={{ width: 500 }}
          id={htmlIdGenerator()()}
          value={value}
          onChange={(e) => onChange(e)}
          showTicks
          showRange
          fullWidth
          aria-label="An example of EuiRange with levels prop"
          aria-describedby="levelsHelp2"
          min={40}
          max={100}
          ticks={ticks}
        />
      </EuiPopover>
    </>
  );
}
