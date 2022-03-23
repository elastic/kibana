/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDescribedFormGroup, EuiFormRow, EuiLink, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useMemo } from 'react';
import { useTrackPageview } from '../../../../../observability/public';
import { LogIndexPatternReference } from '../../../../common/log_sources';
import { useLinkProps } from '../../../../../observability/public';
import { FormElement } from './form_elements';
import { getFormRowProps } from './form_field_props';
import { IndexPatternSelector } from './index_pattern_selector';
import { FormValidationError } from './validation_errors';

export const IndexPatternConfigurationPanel: React.FC<{
  isLoading: boolean;
  isReadOnly: boolean;
  indexPatternFormElement: FormElement<LogIndexPatternReference | undefined, FormValidationError>;
}> = ({ isLoading, isReadOnly, indexPatternFormElement }) => {
  useTrackPageview({ app: 'infra_logs', path: 'log_source_configuration_index_pattern' });
  useTrackPageview({
    app: 'infra_logs',
    path: 'log_source_configuration_index_pattern',
    delay: 15000,
  });

  const changeIndexPatternId = useCallback(
    (indexPatternId: string | undefined) => {
      if (indexPatternId != null) {
        indexPatternFormElement.updateValue(() => ({
          type: 'index_pattern',
          indexPatternId,
        }));
      } else {
        indexPatternFormElement.updateValue(() => undefined);
      }
    },
    [indexPatternFormElement]
  );

  return (
    <>
      <DataViewsInlineHelpMessage />
      <EuiSpacer size="m" />
      <EuiDescribedFormGroup
        title={
          <h4>
            <FormattedMessage
              id="xpack.infra.logSourceConfiguration.dataViewTitle"
              defaultMessage="Log data view"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.infra.logSourceConfiguration.dataViewDescription"
            defaultMessage="Data view that contains log data"
          />
        }
      >
        <EuiFormRow
          fullWidth
          label={
            <FormattedMessage
              id="xpack.infra.logSourceConfiguration.dataViewLabel"
              defaultMessage="Log data view"
            />
          }
          {...useMemo(
            () => (isLoading ? {} : getFormRowProps(indexPatternFormElement)),
            [isLoading, indexPatternFormElement]
          )}
        >
          <IndexPatternSelector
            isLoading={isLoading || indexPatternFormElement.validity.validity === 'pending'}
            isReadOnly={isReadOnly}
            indexPatternId={indexPatternFormElement.value?.indexPatternId}
            onChangeIndexPatternId={changeIndexPatternId}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </>
  );
};

const DataViewsInlineHelpMessage = React.memo(() => {
  const dataViewsManagementLinkProps = useLinkProps({
    app: 'management',
    pathname: '/kibana/dataViews',
  });

  return (
    <FormattedMessage
      id="xpack.infra.logSourceConfiguration.logDataViewHelpText"
      defaultMessage="Data views are shared among apps in the Kibana space and can be managed via the {dataViewsManagementLink}. A single data view can target multiple indices."
      values={{
        dataViewsManagementLink: (
          <EuiLink {...dataViewsManagementLinkProps}>
            <FormattedMessage
              id="xpack.infra.logSourceConfiguration.dataViewsManagementLinkText"
              defaultMessage="data views management screen"
            />
          </EuiLink>
        ),
      }}
    />
  );
});
