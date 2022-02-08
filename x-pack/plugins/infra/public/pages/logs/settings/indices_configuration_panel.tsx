/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCheckableCard, EuiFormFieldset, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { useUiTracker } from '../../../../../observability/public';
import {
  logIndexNameReferenceRT,
  LogIndexPatternReference,
  logIndexPatternReferenceRT,
  LogIndexReference,
} from '../../../../common/log_sources';
import { FormElement, isFormElementForType } from './form_elements';
import { IndexNamesConfigurationPanel } from './index_names_configuration_panel';
import { IndexPatternConfigurationPanel } from './index_pattern_configuration_panel';
import { FormValidationError } from './validation_errors';

export const IndicesConfigurationPanel = React.memo<{
  isLoading: boolean;
  isReadOnly: boolean;
  indicesFormElement: FormElement<LogIndexReference | undefined, FormValidationError>;
}>(({ isLoading, isReadOnly, indicesFormElement }) => {
  const trackSwitchToIndexPatternReference = useUiTracker({ app: 'infra_logs' });

  return (
    <EuiFormFieldset
      legend={{
        children: (
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.infra.logSourceConfiguration.logSourcesTitle"
                defaultMessage="Log sources"
              />
            </h3>
          </EuiTitle>
        ),
      }}
    >
      <EuiCheckableCard
        id="dataView"
        label={
          <EuiTitle size="xs">
            <h2>
              <FormattedMessage
                id="xpack.infra.logSourceConfiguration.dataViewSectionTitle"
                defaultMessage="Data view (recommended)"
              />
            </h2>
          </EuiTitle>
        }
        name="dataView"
        value="dataView"
        checked={isIndexPatternFormElement(indicesFormElement)}
        onChange={() => {
          if (indicesFormElement.initialValue?.type === 'index_pattern') {
            indicesFormElement.updateValue(() => indicesFormElement.initialValue);
          } else {
            indicesFormElement.updateValue(() => ({
              type: 'index_pattern',
              indexPatternId: '',
            }));
          }

          trackSwitchToIndexPatternReference({
            metric: 'configuration_switch_to_index_pattern_reference',
          });
        }}
        disabled={isReadOnly}
      >
        {isIndexPatternFormElement(indicesFormElement) && (
          <IndexPatternConfigurationPanel
            isLoading={isLoading}
            isReadOnly={isReadOnly}
            indexPatternFormElement={indicesFormElement}
          />
        )}
      </EuiCheckableCard>
      <EuiSpacer size="m" />

      <EuiCheckableCard
        id="indexNames"
        label={
          <EuiTitle size="xs">
            <h2>
              <FormattedMessage
                id="xpack.infra.sourceConfiguration.indicesSectionTitle"
                defaultMessage="Indices"
              />
            </h2>
          </EuiTitle>
        }
        name="indexNames"
        value="indexNames"
        checked={isIndexNamesFormElement(indicesFormElement)}
        onChange={() => {
          if (indicesFormElement.initialValue?.type === 'index_name') {
            indicesFormElement.updateValue(() => indicesFormElement.initialValue);
          } else {
            indicesFormElement.updateValue(() => ({
              type: 'index_name',
              indexName: '',
            }));
          }
        }}
        disabled={isReadOnly}
      >
        {isIndexNamesFormElement(indicesFormElement) && (
          <IndexNamesConfigurationPanel
            isLoading={isLoading}
            isReadOnly={isReadOnly}
            indexNamesFormElement={indicesFormElement}
          />
        )}
      </EuiCheckableCard>
      <EuiSpacer size="m" />
    </EuiFormFieldset>
  );
});

const isIndexPatternFormElement = isFormElementForType(
  (value): value is LogIndexPatternReference | undefined =>
    value == null || logIndexPatternReferenceRT.is(value)
);

const isIndexNamesFormElement = isFormElementForType(logIndexNameReferenceRT.is);
