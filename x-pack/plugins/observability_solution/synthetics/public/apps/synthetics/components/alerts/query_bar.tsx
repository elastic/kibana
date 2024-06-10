/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../common/constants';
import { ClientPluginsStart } from '../../../../plugin';

interface Props {
  query: string;
  onChange: (query: string) => void;
}
export const isValidKuery = (query: string) => {
  if (query === '') {
    return true;
  }
  const listOfOperators = [':', '>=', '=>', '>', '<'];
  for (let i = 0; i < listOfOperators.length; i++) {
    const operator = listOfOperators[i];
    const qParts = query.trim().split(operator);
    if (query.includes(operator) && qParts.length > 1 && qParts[1]) {
      return true;
    }
  }
  return false;
};

export const AlertQueryBar = ({ query = '', onChange }: Props) => {
  const { services } = useKibana<ClientPluginsStart>();

  const {
    appName,
    dataViews,
    unifiedSearch: {
      ui: { QueryStringInput },
    },
  } = services;

  const [inputVal, setInputVal] = useState<string>(query);

  const { data: dataView } = useFetcher(async () => {
    return await dataViews.create({ title: SYNTHETICS_INDEX_PATTERN });
  }, [dataViews]);

  useEffect(() => {
    onChange(query);
    setInputVal(query);
  }, [onChange, query]);

  return (
    <EuiFlexItem grow={1} style={{ flexBasis: 485 }}>
      <QueryStringInput
        indexPatterns={dataView ? [dataView] : []}
        iconType="search"
        isClearable={true}
        onChange={(queryN) => {
          setInputVal(queryN?.query as string);
          if (isValidKuery(queryN?.query as string)) {
            // we want to submit when user clears or paste a complete kuery
            onChange(queryN.query as string);
          }
        }}
        onSubmit={(queryN) => {
          if (queryN) onChange(queryN.query as string);
        }}
        query={{ query: inputVal, language: 'kuery' }}
        dataTestSubj="xpack.synthetics.alerts.monitorStatus.filterBar"
        autoSubmit={true}
        disableLanguageSwitcher={true}
        isInvalid={!!(inputVal && !query)}
        placeholder={i18n.translate('xpack.synthetics.alerts.searchPlaceholder.kql', {
          defaultMessage: 'Filter using kql syntax',
        })}
        appName={appName}
      />
    </EuiFlexItem>
  );
};
