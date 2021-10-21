/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiSpacer, EuiCallOut, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

// TODO: add in a link to documentation?
interface Props {
  onMigrate?: () => void;
}

const DeprecatedCalloutComponent: React.FC<Props> = ({ onMigrate }) => {
  const update =
    onMigrate != null ? (
      <EuiLink onClick={onMigrate} data-test-subj="update-connector-btn">
        {i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.deprecatedCalloutMigrate',
          {
            defaultMessage: 'Update this connector,',
          }
        )}
      </EuiLink>
    ) : (
      <span>
        {i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.deprecatedCalloutMigrate',
          {
            defaultMessage: 'Update this connector,',
          }
        )}
      </span>
    );

  return (
    <>
      <EuiCallOut
        size="m"
        iconType="alert"
        data-test-subj="snDeprecatedCallout"
        color="warning"
        title={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.deprecatedCalloutTitle',
          {
            defaultMessage: 'This connector type is deprecated',
          }
        )}
      >
        <FormattedMessage
          defaultMessage="{update} {create} "
          id="xpack.triggersActionsUI.components.builtinActionTypes.servicenow.appInstallationInfo"
          values={{
            update,
            create: (
              <span>
                {i18n.translate(
                  'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.deprecatedCalloutCreate',
                  {
                    defaultMessage: 'or create a new one.',
                  }
                )}
              </span>
            ),
          }}
        />
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};

export const DeprecatedCallout = memo(DeprecatedCalloutComponent);
