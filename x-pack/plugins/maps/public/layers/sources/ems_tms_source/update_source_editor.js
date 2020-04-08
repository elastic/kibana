/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiTitle, EuiPanel, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { TileServiceSelect } from './tile_service_select';

export function UpdateSourceEditor({ onChange, config }) {
  const _onTileSelect = ({ id, isAutoSelect }) => {
    onChange({ propName: 'id', value: id });
    onChange({ propName: 'isAutoSelect', value: isAutoSelect });
  };

  return (
    <Fragment>
      <EuiPanel>
        <EuiTitle size="xs">
          <h5>
            <FormattedMessage
              id="xpack.maps.source.emsTile.settingsTitle"
              defaultMessage="Basemap"
            />
          </h5>
        </EuiTitle>

        <EuiSpacer size="m" />

        <TileServiceSelect onTileSelect={_onTileSelect} config={config} />
      </EuiPanel>

      <EuiSpacer size="s" />
    </Fragment>
  );
}
