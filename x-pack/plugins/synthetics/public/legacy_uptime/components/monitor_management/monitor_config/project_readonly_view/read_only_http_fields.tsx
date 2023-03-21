/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useHTTPSimpleFieldsContext } from '../../../fleet_package/contexts';
import { ConfigKey } from '../../../../../../common/constants/monitor_management';
import { ProjectReadonlyCommonFields } from './readonly_common_fields';
const noop = () => {};

export const ProjectHTTPReadonlyFields = ({ minColumnWidth }: { minColumnWidth: string }) => {
  const { fields } = useHTTPSimpleFieldsContext();

  const urlField = (
    <EuiFormRow
      label={
        <FormattedMessage
          id="xpack.synthetics.monitorManagement.urlFieldLabel"
          defaultMessage="Url"
        />
      }
      fullWidth={false}
    >
      <EuiFieldText
        defaultValue={fields[ConfigKey.URLS]}
        fullWidth={true}
        name="url"
        onChange={noop}
        onBlur={noop}
        data-test-subj="monitorManagementMonitorUrl"
        readOnly={true}
      />
    </EuiFormRow>
  );

  return (
    <>
      <ProjectReadonlyCommonFields
        minColumnWidth={minColumnWidth}
        extraFields={urlField}
        fields={fields}
      />
    </>
  );
};
