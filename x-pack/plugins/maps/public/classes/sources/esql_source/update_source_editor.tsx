/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiPanel, EuiSkeletonText, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ESQLSourceDescriptor } from '../../../../common/descriptor_types';
import type { OnSourceChangeArgs } from '../source';
import { ESQLEditor } from './esql_editor';
import { getDateFields } from './esql_utils';

interface Props {
  onChange(...args: OnSourceChangeArgs[]): void;
  sourceDescriptor: ESQLSourceDescriptor;
}

export function UpdateSourceEditor(props: Props) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [dateFields, setDateFields] = useState<string[]>([]);

  useEffect(() => {
    let ignore = false;
    getDateFields(props.sourceDescriptor.esql)
      .then((initialDateFields) => {
        if (!ignore) {
          setDateFields(initialDateFields);
          setIsInitialized(true);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setIsInitialized(true);
        }
      });
    return () => {
      ignore = true;
    };
    // only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <EuiPanel>
        <EuiTitle size="xs">
          <h5>
            {i18n.translate('xpack.maps.esqlSearch.sourceEditorTitle', {
              defaultMessage: 'ES|QL',
            })}
          </h5>
        </EuiTitle>

        <EuiSpacer size="m" />

        <EuiSkeletonText
          lines={3}
          isLoading={!isInitialized}
        >
          <ESQLEditor
            esql={props.sourceDescriptor.esql}
            onESQLChange={({ columns, esql }: { columns: ESQLSourceDescriptor['columns'], esql: string }) => {
              props.onChange(
                { propName: 'columns', value: columns },
                { propName: 'esql', value: esql }
              );
            }}
          />
        </EuiSkeletonText>
      </EuiPanel>
      <EuiSpacer size="s" />
    </>
  );
}