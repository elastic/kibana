/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiSkeletonText,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getIndexPatternFromESQLQuery } from '@kbn/es-query';
import type { ESQLSourceDescriptor } from '../../../../common/descriptor_types';
import type { OnSourceChangeArgs } from '../source';
import { ForceRefreshCheckbox } from '../../../components/force_refresh_checkbox';
import { ESQLEditor } from './esql_editor';
import { getDateFields } from './esql_utils';

interface Props {
  onChange(...args: OnSourceChangeArgs[]): void;
  sourceDescriptor: ESQLSourceDescriptor;
}

export function UpdateSourceEditor(props: Props) {
  const [dateFields, setDateFields] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let ignore = false;
    getDateFields(props.sourceDescriptor.esql)
      .then((initialDateFields) => {
        if (ignore) {
          return;
        }
        setDateFields(initialDateFields);
        setIsInitialized(true);
      })
      .catch((err) => {
        if (ignore) {
          return;
        }
        setIsInitialized(true);
      });

    return () => {
      ignore = true;
    };
    // only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dateSelectOptions = useMemo(() => {
    return dateFields.map((dateField) => {
      return {
        value: dateField,
        text: dateField,
      };
    });
  }, [dateFields]);

  const narrowByTimeInput = (
    <EuiSwitch
      label={i18n.translate('xpack.maps.esqlSource.narrowByGlobalTimeLabel', {
        defaultMessage: `Narrow ES|QL statement by global time`,
      })}
      checked={dateFields.length === 0 ? false : !!props.sourceDescriptor.dateField}
      onChange={(event: EuiSwitchEvent) => {
        if (!event.target.checked) {
          props.onChange({ propName: 'dateField', value: undefined });
          return;
        }

        if (dateFields.length) {
          props.onChange({ propName: 'dateField', value: dateFields[0] });
        }
      }}
      disabled={dateFields.length === 0}
      compressed
    />
  );

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

        <EuiSkeletonText lines={3} isLoading={!isInitialized}>
          <ESQLEditor
            esql={props.sourceDescriptor.esql}
            onESQLChange={(change: {
              columns: ESQLSourceDescriptor['columns'];
              dateFields: string[];
              esql: string;
            }) => {
              setDateFields(change.dateFields);
              const changes: OnSourceChangeArgs[] = [
                { propName: 'columns', value: change.columns },
                { propName: 'esql', value: change.esql },
              ];
              if (
                props.sourceDescriptor.dateField &&
                !change.dateFields.includes(props.sourceDescriptor.dateField)
              ) {
                changes.push({
                  propName: 'dateField',
                  value: change.dateFields.length ? change.dateFields[0] : undefined,
                });
              }
              props.onChange(...changes);
            }}
          />

          <EuiSpacer size="m" />

          <EuiFormRow>
            <EuiSwitch
              label={i18n.translate('xpack.maps.esqlSource.narrowByMapExtentLabel', {
                defaultMessage: 'Narrow ES|QL statement by visible map area',
              })}
              checked={props.sourceDescriptor.narrowByMapBounds}
              onChange={(event: EuiSwitchEvent) => {
                props.onChange({ propName: 'narrowByMapBounds', value: event.target.checked });
              }}
              compressed
            />
          </EuiFormRow>

          <EuiFormRow>
            <EuiSwitch
              label={i18n.translate('xpack.maps.esqlSource.narrowByGlobalSearchLabel', {
                defaultMessage: `Narrow ES|QL statement by global search`,
              })}
              checked={props.sourceDescriptor.narrowByGlobalSearch}
              onChange={(event: EuiSwitchEvent) => {
                props.onChange({ propName: 'narrowByGlobalSearch', value: event.target.checked });
              }}
              compressed
            />
          </EuiFormRow>

          <EuiFormRow>
            {dateFields.length === 0 ? (
              <EuiToolTip
                position="top"
                content={i18n.translate('xpack.maps.esqlSource.noDateFieldsDisabledMsg', {
                  defaultMessage: `No date fields are available from index pattern: {pattern}.`,
                  values: {
                    pattern: getIndexPatternFromESQLQuery(props.sourceDescriptor.esql),
                  },
                })}
              >
                {narrowByTimeInput}
              </EuiToolTip>
            ) : (
              narrowByTimeInput
            )}
          </EuiFormRow>

          {props.sourceDescriptor.dateField && (
            <EuiFormRow
              label={i18n.translate('xpack.maps.source.esqlSource.dateFieldSelectLabel', {
                defaultMessage: 'Date field',
              })}
              display="columnCompressed"
            >
              <EuiSelect
                options={dateSelectOptions}
                value={props.sourceDescriptor.dateField}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                  props.onChange({ propName: 'dateField', value: e.target.value });
                }}
                compressed
              />
            </EuiFormRow>
          )}

          <ForceRefreshCheckbox
            applyForceRefresh={props.sourceDescriptor.applyForceRefresh}
            setApplyForceRefresh={(applyForceRefresh: boolean) => {
              props.onChange({ propName: 'applyForceRefresh', value: applyForceRefresh });
            }}
          />
        </EuiSkeletonText>
      </EuiPanel>
      <EuiSpacer size="s" />
    </>
  );
}
