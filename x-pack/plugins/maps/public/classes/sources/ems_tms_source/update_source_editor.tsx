/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { Fragment } from 'react';
import { OnSourceChangeArgs } from '../source';
import { EmsTmsSourceConfig, TileServiceSelect } from './tile_service_select';

interface Props {
  onChange: (...args: OnSourceChangeArgs[]) => Promise<void>;
  config: EmsTmsSourceConfig;
}

export function UpdateSourceEditor({ onChange, config }: Props) {
  const _onTileSelect = ({ id, isAutoSelect }: EmsTmsSourceConfig) => {
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
