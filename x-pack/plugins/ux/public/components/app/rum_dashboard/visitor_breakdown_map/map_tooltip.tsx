/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiOutsideClickDetector,
  EuiPopoverTitle,
} from '@elastic/eui';
import styled from 'styled-components';
import {
  COUNTRY_NAME,
  REGION_NAME,
  TRANSACTION_DURATION_COUNTRY,
  TRANSACTION_DURATION_REGION,
} from './use_layer_list';
import type { RenderTooltipContentParams } from '../../../../../../maps/public';
import { I18LABELS } from '../translations';

type MapToolTipProps = Partial<RenderTooltipContentParams>;

const DescriptionItem = styled(EuiDescriptionListDescription)`
  &&& {
    width: 25%;
  }
`;

const TitleItem = styled(EuiDescriptionListTitle)`
  &&& {
    width: 75%;
  }
`;

function MapToolTipComponent({
  closeTooltip,
  features = [],
  loadFeatureProperties,
}: MapToolTipProps) {
  const { id: featureId, layerId, mbProperties } = features[0] ?? {};

  const [regionName, setRegionName] = useState<string>(featureId as string);
  const [pageLoadDuration, setPageLoadDuration] = useState<string>('');

  const formatPageLoadValue = (val: number) => {
    const valInMs = val / 1000;
    if (valInMs > 1000) {
      return (valInMs / 1000).toFixed(2) + ' sec';
    }

    return (valInMs / 1000).toFixed(0) + ' ms';
  };

  useEffect(() => {
    const loadRegionInfo = async () => {
      if (loadFeatureProperties) {
        const items = await loadFeatureProperties({
          layerId,
          properties: mbProperties,
        });
        items.forEach((item) => {
          if (
            item.getPropertyKey() === COUNTRY_NAME ||
            item.getPropertyKey() === REGION_NAME
          ) {
            setRegionName(item.getRawValue() as string);
          }
          if (
            item.getPropertyKey() === TRANSACTION_DURATION_REGION ||
            item.getPropertyKey() === TRANSACTION_DURATION_COUNTRY
          ) {
            setPageLoadDuration(
              formatPageLoadValue(+(item.getRawValue() as string))
            );
          }
        });
      }
    };
    loadRegionInfo();
  });

  return (
    <EuiOutsideClickDetector
      onOutsideClick={() => {
        if (closeTooltip != null) {
          closeTooltip();
        }
      }}
    >
      <>
        <EuiPopoverTitle>{regionName}</EuiPopoverTitle>
        <EuiDescriptionList
          type="column"
          textStyle="reverse"
          compressed={true}
          style={{ width: 300 }}
        >
          <TitleItem className="eui-textNoWrap">
            {I18LABELS.avgPageLoadDuration}
          </TitleItem>
          <DescriptionItem>{pageLoadDuration}</DescriptionItem>
        </EuiDescriptionList>
      </>
    </EuiOutsideClickDetector>
  );
}

export const MapToolTip = React.memo(MapToolTipComponent);
