/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiText, EuiToolTip } from '@elastic/eui';
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
                  defaultMessage="Group documents into grids with a weighted center for each grid cell."
                />
              </p>
            </dd>

            <dt>{GRID_LABEL}</dt>
            <dd>
              <p>
                <FormattedMessage
                  id="xpack.maps.source.esGeoGrid.gridDescription"
                  defaultMessage="Group documents into grids."
                />
              </p>
            </dd>

            <dt>{HEX_LABEL}</dt>
            <dd>
              <p>
                <FormattedMessage
                  id="xpack.maps.source.esGeoGrid.hexDescription"
                  defaultMessage="Group documents into hexagons."
                />
              </p>
              {props.isHexDisabled ? <em>{props.hexDisabledReason}</em> : null}
            </dd>
          </dl>
        </EuiText>
      }
    >
      <span>
        <FormattedMessage id="xpack.maps.source.esGeoGrid.showAsLabel" defaultMessage="Show as" />{' '}
        <EuiIcon type="questionInCircle" color="subdued" />
      </span>
    </EuiToolTip>
  );
}
