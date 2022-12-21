/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { EuiCode, EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { OsqueryIcon } from '../../components/osquery_icon';
import { useKibana } from '../../common/lib/kibana';
import type { ServicesWrapperProps } from '../services_wrapper';
import ServicesWrapper from '../services_wrapper';
import { PERMISSION_DENIED } from '../osquery_action/translations';

export interface IExternalReferenceMetaDataProps {
  externalReferenceMetadata: {
    actionId: string;
    agentIds: string[];
    queryId: string;
  };
}
const AttachmentContent = lazy(() => import('./external_references_content'));

export const getLazyExternalContent =
  // eslint-disable-next-line react/display-name
  (services: ServicesWrapperProps['services']) => (props: IExternalReferenceMetaDataProps) => {
    const {
      services: {
        application: {
          capabilities: { osquery },
        },
      },
    } = useKibana();

    if (!osquery.read) {
      return (
        <EuiEmptyPrompt
          icon={<OsqueryIcon />}
          title={<h2>{PERMISSION_DENIED}</h2>}
          titleSize="xs"
          body={
            <FormattedMessage
              id="xpack.osquery.cases.permissionDenied"
              defaultMessage=" To access these results, ask your administrator for {osquery} Kibana
              privileges."
              // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
              values={{
                osquery: <EuiCode>osquery</EuiCode>,
              }}
            />
          }
        />
      );
    }

    return (
      <Suspense fallback={null}>
        <ServicesWrapper services={services}>
          <AttachmentContent {...props} />
        </ServicesWrapper>
      </Suspense>
    );
  };
