/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import type { Required } from 'utility-types';
import { FormattedMessage } from '@kbn/i18n-react';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { dynamic } from '@kbn/shared-ux-utility';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { DatePickerContextProvider } from '@kbn/ml-date-picker';
import type { DatePickerDependencies } from '@kbn/ml-date-picker';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { pick } from 'lodash';
import { getCoreStart, getPluginsStart } from '../../../../kibana_services';
import type {
  FieldStatisticTableEmbeddableProps,
  ESQLDataVisualizerGridEmbeddableState,
} from './types';

const EmbeddableESQLFieldStatsTableWrapper = dynamic(
  () => import('./embeddable_esql_field_stats_table')
);
const EmbeddableFieldStatsTableWrapper = dynamic(() => import('./embeddable_field_stats_table'));

function isESQLFieldStatisticTableEmbeddableState(
  input: FieldStatisticTableEmbeddableProps
): input is ESQLDataVisualizerGridEmbeddableState {
  return isPopulatedObject(input, ['esql']) && input.esql === true;
}

function isFieldStatisticTableEmbeddableState(
  input: FieldStatisticTableEmbeddableProps
): input is Required<FieldStatisticTableEmbeddableProps, 'dataView'> {
  return isPopulatedObject(input, ['dataView']) && Boolean(input.esql) === false;
}

const FieldStatisticsWrapperContent = (props: FieldStatisticTableEmbeddableProps) => {
  if (isESQLFieldStatisticTableEmbeddableState(props)) {
    return <EmbeddableESQLFieldStatsTableWrapper {...props} />;
  }
  if (isFieldStatisticTableEmbeddableState(props)) {
    return <EmbeddableFieldStatsTableWrapper {...props} />;
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

const FieldStatisticsWrapper = (props: FieldStatisticTableEmbeddableProps) => {
  const coreStart = getCoreStart();
  const {
    data,
    maps,
    embeddable,
    share,
    security,
    fileUpload,
    lens,
    dataViewFieldEditor,
    uiActions,
    charts,
    unifiedSearch,
  } = getPluginsStart();
  const services = {
    ...coreStart,
    data,
    maps,
    embeddable,
    share,
    security,
    fileUpload,
    lens,
    dataViewFieldEditor,
    uiActions,
    charts,
    unifiedSearch,
  };

  const { overridableServices } = props;

  const kibanaRenderServices = useMemo(
    () => pick(coreStart, 'analytics', 'i18n', 'theme'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const servicesWithOverrides = useMemo(
    () => ({ ...services, ...(overridableServices ?? {}) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const datePickerDeps: DatePickerDependencies = useMemo(
    () => ({
      ...pick(servicesWithOverrides, [
        'data',
        'http',
        'notifications',
        'theme',
        'uiSettings',
        'i18n',
      ]),
      uiSettingsKeys: UI_SETTINGS,
    }),
    [servicesWithOverrides]
  );

  return (
    <KibanaRenderContextProvider {...kibanaRenderServices}>
      <KibanaContextProvider services={servicesWithOverrides}>
        <DatePickerContextProvider {...datePickerDeps}>
          <FieldStatisticsWrapperContent
            dataView={props.dataView}
            esql={props.esql}
            filters={props.filters}
            lastReloadRequestTime={props.lastReloadRequestTime}
            onAddFilter={props.onAddFilter}
            onTableUpdate={props.onTableUpdate}
            query={props.query}
            samplingOption={props.samplingOption}
            savedSearch={props.savedSearch}
            sessionId={props.sessionId}
            shouldGetSubfields={props.shouldGetSubfields}
            showPreviewByDefault={props.showPreviewByDefault}
            totalDocuments={props.totalDocuments}
            visibleFieldNames={props.visibleFieldNames}
          />
        </DatePickerContextProvider>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>
  );
};
// exporting as default so it can be used with React.lazy
// eslint-disable-next-line import/no-default-export
export default FieldStatisticsWrapper;
