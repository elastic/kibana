/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiPanel, EuiSkeletonText, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getIndexPatternFromESQLQuery } from '@kbn/es-query';
import type { ESQLSourceDescriptor } from '../../../../common/descriptor_types';
import type { OnSourceChangeArgs } from '../source';
import { ESQLEditor } from './esql_editor';
import { getDateFields } from './esql_utils';
import { GlobalTimeCheckbox } from '../../../components/global_time_checkbox';

interface Props {
  onChange(...args: OnSourceChangeArgs[]): void;
  sourceDescriptor: ESQLSourceDescriptor;
}

export function UpdateSourceEditor(props: Props) {
  const [applyGlobalTime, setApplyGlobalTime] = useState(!!props.sourceDescriptor.dateField);
  const [dateFields, setDateFields] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

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
            onESQLChange={({ columns, dateFields: nextDateFields, esql }: { columns: ESQLSourceDescriptor['columns'], dateFields: string[]; esql: string }) => {
              setDateFields(nextDateFields);
              const changes: OnSourceChangeArgs[] = [
                { propName: 'columns', value: columns },
                { propName: 'esql', value: esql }
              ];
              if (props.sourceDescriptor.dateField && !nextDateFields.includes(props.sourceDescriptor.dateField)) {
                changes.push({ propName: 'dateField', value: nextDateFields.length ? nextDateFields[0] : undefined });
              }
              props.onChange(...changes);
            }}
          />

          <EuiSpacer size="m" />

          <GlobalTimeCheckbox 
            applyGlobalTime={applyGlobalTime}
            label={i18n.translate('xpack.maps.esqlSource.applyGlobalTimeCheckboxLabel', {
              defaultMessage: `Apply global time to ES|QL statement`,
            })}
            setApplyGlobalTime={(applyGlobalTime: boolean) => {
              if (!applyGlobalTime) {
                props.onChange({ propName: 'dateField', value: undefined });
                setApplyGlobalTime(false);
                return;
              }

              if (dateFields.length) {
                props.onChange({ propName: 'dateField', value: dateFields[0] });
                setApplyGlobalTime(true);
              }
            }}
            disabledReason={dateFields.length === 0
              ? i18n.translate('xpack.maps.esqlSource.noDateFieldsDisabledMsg', {
                  defaultMessage: `No date fields are available from index pattern: {pattern}.`,
                  values: {
                    pattern: getIndexPatternFromESQLQuery(props.sourceDescriptor.esql),
                  }
                })
              : undefined
            }
          />
        </EuiSkeletonText>
      </EuiPanel>
      <EuiSpacer size="s" />
    </>
  );
}