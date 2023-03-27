/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useMemo } from 'react';

import { useValues } from 'kea';

import { EuiFlexItem } from '@elastic/eui';
import { DataView } from '@kbn/data-views-plugin/common';

import { TimeRange } from '@kbn/es-query';
import { DefaultInspectorAdapters } from '@kbn/expressions-plugin/common';
import { FormulaPublicApi, TypedLensByValueInput } from '@kbn/lens-plugin/public';

import { KibanaLogic } from '../../shared/kibana';

export interface WithLensDataInputProps {
  id: string;
  timeRange: TimeRange;
}

interface WithLensDataParams<Props, OutputState> {
  dataLoadTransform: (
    isLoading: boolean,
    adapters?: Partial<DefaultInspectorAdapters>
  ) => OutputState;
  getAttributes: (
    dataView: DataView,
    formulaApi: FormulaPublicApi,
    props: Props
  ) => TypedLensByValueInput['attributes'];
  getDataViewQuery: (props: Props) => string;
  initialValues: OutputState;
}

export const withLensData = <T extends {} = {}, OutputState extends {} = {}>(
  Component: React.FC<T & OutputState>,
  {
    dataLoadTransform,
    getAttributes,
    getDataViewQuery,
    initialValues,
  }: WithLensDataParams<Omit<T, keyof OutputState>, OutputState>
) => {
  const ComponentWithLensData: React.FC<T & WithLensDataInputProps> = (props) => {
    const {
      lens: { EmbeddableComponent, stateHelperApi },
      data: { dataViews },
    } = useValues(KibanaLogic);
    const [dataView, setDataView] = useState<DataView | null>(null);
    const [data, setData] = useState<OutputState>(initialValues);
    const [formula, setFormula] = useState<FormulaPublicApi | null>(null);
    const attributes = useMemo(
      () => dataView && formula && getAttributes(dataView, formula, props),
      [dataView, formula, props]
    );

    useEffect(() => {
      (async () => {
        const [target] = await dataViews.find(getDataViewQuery(props), 1);

        if (target) {
          setDataView(target);
        }
      })();
    }, [props]);
    useEffect(() => {
      (async () => {
        const helper = await stateHelperApi();

        setFormula(helper.formula);
      })();
    }, []);

    return (
      <>
        <Component {...(props as T)} {...data} />
        {attributes && (
          <EuiFlexItem css={{ display: 'none' }}>
            <EmbeddableComponent
              id={props.id}
              timeRange={props.timeRange}
              attributes={attributes}
              onLoad={(...args) => {
                if (dataLoadTransform) {
                  setData(dataLoadTransform(...args));
                }
              }}
            />
          </EuiFlexItem>
        )}
      </>
    );
  };
  ComponentWithLensData.displayName = `withLensDataHOC(${Component.displayName || Component.name})`;

  return ComponentWithLensData;
};
