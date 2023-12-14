/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ESQLSourceDescriptor } from '../../../../common/descriptor_types';
import type { OnSourceChangeArgs } from '../source';
import { ESQLEditor } from './esql_editor';

interface Props {
  onChange(...args: OnSourceChangeArgs[]): void;
  sourceDescriptor: ESQLSourceDescriptor;
}

export function UpdateSourceEditor(props: Props) {
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

        <ESQLEditor
          dateField={props.sourceDescriptor.dateField}
          onDateFieldChange={(dateField?: string) => {
            props.onChange({ propName: 'dateField', value: dateField });
          }}
          esql={props.sourceDescriptor.esql}
          onESQLChange={({ columns, esql }: { columns: ESQLSourceDescriptor['columns'], esql: string }) => {
            props.onChange(
              { propName: 'columns', value: columns },
              { propName: 'esql', value: esql }
            );
          }}
        />
      </EuiPanel>
      <EuiSpacer size="s" />
    </>
  );
}