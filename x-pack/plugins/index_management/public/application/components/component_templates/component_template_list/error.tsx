/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { FunctionComponent } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiLink, EuiCallOut } from '@elastic/eui';

export interface Props {
  onReloadClick: () => void;
}

export const LoadError: FunctionComponent<Props> = ({ onReloadClick }) => {
  return (
    <EuiCallOut
      iconType="faceSad"
      color="danger"
      data-test-subj="componentTemplatesLoadError"
      title={
        <FormattedMessage
          id="xpack.idxMgmt.home.componentTemplates.list.loadErrorTitle"
          defaultMessage="Unable to load component templates. {reloadLink}"
          values={{
            reloadLink: (
              <EuiLink onClick={onReloadClick}>
                <FormattedMessage
                  id="xpack.idxMgmt.home.componentTemplates.list.loadErrorReloadLinkLabel"
                  defaultMessage="Try again."
                />
              </EuiLink>
            ),
          }}
        />
      }
    />
  );
};
