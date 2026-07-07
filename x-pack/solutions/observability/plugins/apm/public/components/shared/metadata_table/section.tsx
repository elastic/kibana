/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { isEmpty } from 'lodash';
import { i18n } from '@kbn/i18n';
import { EuiText } from '@elastic/eui';
import { KeyValueTable } from '@kbn/key-value-metadata-table';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { UI_SETTINGS } from '@kbn/data-plugin/common';

interface Props {
  properties: Array<{ field: string; value: string[] | number[] }>;
}

export function Section({ properties }: Props) {
  const {
    services: { uiSettings },
  } = useKibana();
  const dateFormatSetting = uiSettings?.get(UI_SETTINGS.DATE_FORMAT);
  const timezoneSetting = uiSettings?.get(UI_SETTINGS.DATEFORMAT_TZ);

  if (!isEmpty(properties)) {
    return (
      <KeyValueTable
        keyValuePairs={properties.map((property) => ({
          key: property.field,
          value: property.value,
        }))}
        dateFormat={dateFormatSetting}
        dateTimezone={timezoneSetting}
      />
    );
  }
  return (
    <EuiText size="s">
      {i18n.translate('xpack.apm.propertiesTable.agentFeature.noDataAvailableLabel', {
        defaultMessage: 'No data available',
      })}
    </EuiText>
  );
}
