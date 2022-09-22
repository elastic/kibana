/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCode, EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ResponseActionValidatorRef } from '../response_actions_form';
import type { ArrayItem } from '../../../shared_imports';
import { useKibana } from '../../../common/lib/kibana';
import { NOT_AVAILABLE, PERMISSION_DENIED, SHORT_EMPTY_TITLE } from './translations';

interface IProps {
  item: ArrayItem;
  formRef: React.RefObject<ResponseActionValidatorRef>;
}

export const OsqueryResponseAction = React.memo((props: IProps) => {
  const { osquery, application } = useKibana().services;
  const OsqueryForm = useMemo(
    () => osquery?.OsqueryResponseActionTypeForm,
    [osquery?.OsqueryResponseActionTypeForm]
  );

  if (osquery) {
    const { disabled, permissionDenied } = osquery?.fetchInstallationStatus();
    const disabledOsqueryPermission = !(
      application?.capabilities?.osquery?.writeLiveQueries ||
      (application?.capabilities?.osquery?.runSavedQueries &&
        (application?.capabilities?.osquery?.readSavedQueries ||
          application?.capabilities?.osquery?.readPacks))
    );

    if (permissionDenied || disabledOsqueryPermission) {
      return (
        <>
          <EuiEmptyPrompt
            title={<h2>{PERMISSION_DENIED}</h2>}
            titleSize="xs"
            iconType="logoOsquery"
            body={
              <p>
                <FormattedMessage
                  id="xpack.securitySolution.osquery.action.missingPrivilleges"
                  defaultMessage="To access this page, ask your administrator for {osquery} Kibana privileges."
                  values={{
                    // TODO fix error
                    // eslint-disable-next-line react/jsx-no-literals
                    osquery: <EuiCode>osquery</EuiCode>,
                  }}
                />
              </p>
            }
          />
        </>
      );
    }

    if (disabled) {
      return (
        <EuiEmptyPrompt
          iconType="logoOsquery"
          title={<h2>{SHORT_EMPTY_TITLE}</h2>}
          titleSize="xs"
          body={<p>{NOT_AVAILABLE}</p>}
        />
      );
    }
    if (OsqueryForm) {
      return <OsqueryForm {...props} />;
    }
  }

  return null;
});
OsqueryResponseAction.displayName = 'OsqueryResponseAction';
