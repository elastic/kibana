/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiText, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { CLUSTER_LABEL, GRID_LABEL, HEX_LABEL } from './i18n_constants';

interface Props {
  isHexDisabled: boolean;
  hexDisabledReason: string;
}

export function ShowAsLabel(props: Props) {
  return (
    <EuiToolTip
      content={
        <EuiText>
          <dl>
            <dt>{CLUSTER_LABEL}</dt>
            <dd>
              <p>
                <FormattedMessage
                  id="xpack.maps.source.esGeoGrid.clusterDescription"
                  defaultMessage="Uses geotile grid aggregation to group your documents into grids. The cluster location is the weighted centroid for all documents in the gridded cell."
                />
              </p>
            </dd>

            <dt>{GRID_LABEL}</dt>
            <dd>
              <p>
                <FormattedMessage
                  id="xpack.maps.source.esGeoGrid.gridDescription"
                  defaultMessage="Uses geotile grid aggregation to group your documents into grids. Displays the bounding box polygon for each gridded cell."
                />
              </p>
            </dd>

            <dt>{HEX_LABEL}</dt>
            <dd>
              <p>
                <FormattedMessage
                  id="xpack.maps.source.esGeoGrid.hexDescription"
                  defaultMessage="Uses geohex grid aggregation to group your documents into H3 hexagon grids. Displays the hexagon polygon for each gridded cell."
                />
              </p>
              {props.isHexDisabled ? <em>{props.hexDisabledReason}</em> : null}
            </dd>
          </dl>
        </EuiText>
      }
    >
      <span>
        <FormattedMessage
          id="xpack.maps.source.esGeoGrid.showAsLabel"
          defaultMessage="Show as"
        />
        {' '}
        <EuiIcon type="questionInCircle" color="subdued" />
      </span>
    </EuiToolTip>
  );
}