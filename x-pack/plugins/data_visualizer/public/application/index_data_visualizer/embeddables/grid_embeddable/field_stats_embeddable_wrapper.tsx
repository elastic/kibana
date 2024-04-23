/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { pick } from 'lodash';
import type { Observable } from 'rxjs';
import { Subject } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import ReactDOM from 'react-dom';
import React, { Suspense } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { EuiEmptyPrompt } from '@elastic/eui';
import type { Required } from 'utility-types';
import { FormattedMessage } from '@kbn/i18n-react';
import type { IContainer } from '@kbn/embeddable-plugin/public';
import { Embeddable } from '@kbn/embeddable-plugin/public';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { DatePickerContextProvider } from '@kbn/ml-date-picker';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import type { DataVisualizerStartDependencies } from '../../../../plugin';
import { DATA_VISUALIZER_GRID_EMBEDDABLE_TYPE } from './constants';
import { EmbeddableLoading } from './embeddable_loading_fallback';
import { EmbeddableESQLFieldStatsTableWrapper } from './embeddable_esql_field_stats_table';
import { EmbeddableFieldStatsTableWrapper } from './embeddable_field_stats_table';
import type {
  DataVisualizerGridEmbeddableInput,
  ESQLDataVisualizerGridEmbeddableInput,
  DataVisualizerGridEmbeddableOutput,
} from './types';
export type DataVisualizerGridEmbeddableServices = [CoreStart, DataVisualizerStartDependencies];
export type IDataVisualizerGridEmbeddable = typeof DataVisualizerGridEmbeddable;

function isESQLDataVisualizerEmbeddableInput(
  input: unknown
): input is ESQLDataVisualizerGridEmbeddableInput {
  return isPopulatedObject(input, ['esql']) && input.esql === true;
}

function isDataVisualizerEmbeddableInput(
  input: unknown
): input is Required<DataVisualizerGridEmbeddableInput, 'dataView'> {
  return isPopulatedObject(input, ['dataView']);
}

const FieldStatisticsWrapper = (props: {
  id: string;
  embeddableState$: Readonly<Observable<DataVisualizerGridEmbeddableInput>>;
  onOutputChange?: (output: any) => void;
  onAddFilter?: (field: DataViewField | string, value: string, type: '+' | '-') => void;
}) => {
  const { embeddableState$, onOutputChange, onAddFilter } = props;

  const input = useObservable(embeddableState$);

  if (isESQLDataVisualizerEmbeddableInput(input)) {
    return (
      <EmbeddableESQLFieldStatsTableWrapper input={input} onOutputChange={onOutputChange} onA />
    );
  }
  if (isDataVisualizerEmbeddableInput(input)) {
    return (
      <EmbeddableFieldStatsTableWrapper
        input={input}
        onOutputChange={onOutputChange}
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
