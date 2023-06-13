/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { get } from 'lodash';

interface EndpointCallOutProps {
  basePath: string;
}

const EndpointActionCalloutComponent = ({ basePath }: EndpointCallOutProps) => {
  const [data] = useFormData();
  const currentCommand = get(data, `${basePath}.command`);

  if (currentCommand === 'isolate') {
    return (
      <>
        <EuiSpacer size="s" />
        <EuiCallOut color="warning" iconType="warning" title="Proceed with caution">
          <FormattedMessage
            id="xpack.securitySolution.responseActionsList.endpoint.caution"
            defaultMessage="Automatic host isolation based on a detection rule execution could result in
              unintended consequences, such as disrupting legitimate user activities or blocking
              critical business processes"
          />
        </EuiCallOut>
        <EuiSpacer size="s" />
      </>
    );
  }
  return <></>;
};

export const EndpointActionCallout = React.memo(EndpointActionCalloutComponent);
