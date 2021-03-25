/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDescribedFormGroup, EuiFormRow, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useCallback } from 'react';
import { FormElementProps, getFormRowProps } from './form_elements';
import { IndexPatternSelector } from './index_pattern_selector';
import { LogIndexPatternReference } from './types';

export const IndexPatternConfigurationPanel: React.FC<{
  isLoading: boolean;
  isReadOnly: boolean;
  indexPatternFormElementProps: FormElementProps<LogIndexPatternReference | undefined>;
}> = ({ isLoading, isReadOnly, indexPatternFormElementProps }) => {
  const changeIndexPatternId = useCallback(
    (indexPattern: string | undefined) => {
      if (indexPattern != null) {
        indexPatternFormElementProps.onChange?.({ type: 'index-pattern', indexPattern });
      } else {
        indexPatternFormElementProps.onChange?.(undefined);
      }
    },
    [indexPatternFormElementProps]
  );

  return (
    <>
      <EuiTitle size="s">
        <h3>
          <FormattedMessage
            id="xpack.infra.logSourceConfiguration.indexPatternSectionTitle"
            defaultMessage="Index pattern"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <FormattedMessage
        id="xpack.infra.logSourceConfiguration.logIndexPatternHelpText"
        defaultMessage="Helpful text explaining the cross-app advantages of Kibana index patterns and linking to the management screen."
      />
      <EuiSpacer size="m" />
      <EuiDescribedFormGroup
        title={
          <h4>
            <FormattedMessage
              id="xpack.infra.logSourceConfiguration.logIndexPatternTitle"
              defaultMessage="Log index pattern"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.infra.logSourceConfiguration.logIndexPatternDescription"
            defaultMessage="Index pattern that contains log data"
          />
        }
      >
        <EuiFormRow
          fullWidth
          label={
            <FormattedMessage
              id="xpack.infra.logSourceConfiguration.logIndexPatternLabel"
              defaultMessage="Log index pattern"
            />
          }
          {...(isLoading ? {} : getFormRowProps(indexPatternFormElementProps))}
        >
          <IndexPatternSelector
            isLoading={isLoading}
            isReadOnly={isReadOnly}
            indexPatternId={indexPatternFormElementProps.value?.indexPattern}
            onChangeIndexPatternId={changeIndexPatternId}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </>
  );
};
