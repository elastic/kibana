/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow, EuiTitle, EuiPanel, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { EmsTmsSourceConfig, TileServiceSelect } from './tile_service_select';
import { OnSourceChangeArgs } from '../source';

interface Props {
  onChange: (...args: OnSourceChangeArgs[]) => Promise<void>;
  config: EmsTmsSourceConfig;
}

export function UpdateSourceEditor({ onChange, config }: Props) {
  const _onTileSelect = ({ id, isAutoSelect }: EmsTmsSourceConfig) => {
    onChange({ propName: 'id', value: id });
    onChange({ propName: 'isAutoSelect', value: isAutoSelect });
  };

  const _onLocaleChange = (options: EuiComboBoxOptionOption[]) => {
    const { value } = options[0];
    if (value) onChange({ propName: 'locale', value });
  };

  const renderShowLocaleSelector = () => {

    // TODO labels need localization
    const languages = [
      {
        key: 'ar',
        value: 'ar',
        label: 'Arabic',
      },
      {
        key: 'en',
        value: 'en',
        label: 'English',
      },
      {
        key: 'ch-CN',
        value: 'zh',
        label: 'Chinese',
      },
      {
        key: 'es',
        value: 'es',
        label: 'Spanish',
      },
      {
        key: 'fr-FR',
        value: 'fr',
        label: 'French',
      },
      {
        key: 'ja-JP',
        value: 'ja',
        label: 'Japanese',
      },
    ];

    return (
      <EuiFormRow
        display="columnCompressed"
        // TODO i18n
        label="Label language"
        helpText="Display labels in a different language"
      >
        <EuiComboBox
          options={languages}
          singleSelection={{ asPlainText: true }}
          selectedOptions={languages.filter(({ value }) => value === config.locale)}
          onChange={_onLocaleChange}
        />
      </EuiFormRow>
    );
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
        <EuiSpacer size="s" />
        {renderShowLocaleSelector()}
      </EuiPanel>

      <EuiSpacer size="s" />
    </Fragment>
  );
}
