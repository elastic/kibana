/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Observable } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { EuiEmptyPrompt } from '@elastic/eui';
import type { Required } from 'utility-types';
import { FormattedMessage } from '@kbn/i18n-react';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import type { DataVisualizerStartDependencies } from '../../../../plugin';
import { EmbeddableESQLFieldStatsTableWrapper } from './embeddable_esql_field_stats_table';
import { EmbeddableFieldStatsTableWrapper } from './embeddable_field_stats_table';
import type {
  FieldStatisticTableEmbeddableState,
  ESQLDataVisualizerGridEmbeddableState,
} from './types';
export type DataVisualizerGridEmbeddableServices = [CoreStart, DataVisualizerStartDependencies];
export type IDataVisualizerGridEmbeddable = typeof DataVisualizerGridEmbeddable;

function isESQLFieldStatisticTableEmbeddableState(
  input: unknown
): input is ESQLDataVisualizerGridEmbeddableState {
  return isPopulatedObject(input, ['esql']) && input.esql === true;
}

function isFieldStatisticTableEmbeddableState(
  input: unknown
): input is Required<FieldStatisticTableEmbeddableState, 'dataView'> {
  return isPopulatedObject(input, ['dataView']) && Boolean(input.esql) === false;
}

const FieldStatisticsWrapper = (props: {
  id: string;
  embeddableState$: Readonly<Observable<FieldStatisticTableEmbeddableState>>;
  onApiUpdate?: (output: any) => void;
  onAddFilter?: (field: DataViewField | string, value: string, type: '+' | '-') => void;
}) => {
  const { embeddableState$, onApiUpdate, onAddFilter } = props;

  const input = useObservable(embeddableState$);

  if (isESQLFieldStatisticTableEmbeddableState(input)) {
    return <EmbeddableESQLFieldStatsTableWrapper input={input} onApiUpdate={onApiUpdate} />;
  }
  if (isFieldStatisticTableEmbeddableState(input)) {
    return (
      <EmbeddableFieldStatsTableWrapper
        input={input}
        onApiUpdate={onApiUpdate}
        onAddFilter={onAddFilter}
      />
    );
  } else {
    return (
      <EuiEmptyPrompt
        iconType="warning"
        iconColor="danger"
        title={
          <h2>
            <FormattedMessage
              id="xpack.dataVisualizer.index.embeddableErrorTitle"
              defaultMessage="Error loading embeddable"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.dataVisualizer.index.embeddableErrorDescription"
              defaultMessage="There was an error loading the embeddable. Please check if all the required input is valid."
            />
          </p>
        }
      />
    );
  }
};

// exporting as default so it can be used with React.lazy
// eslint-disable-next-line import/no-default-export
export default FieldStatisticsWrapper;
