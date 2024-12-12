/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../hooks/use_kibana';

export const CreateIndexButton: React.FC = () => {
  const {
    services: { application, share },
  } = useKibana();

  const createIndexLocator = useMemo(
    () => share.url.locators.get('SEARCH_CREATE_INDEX'),
    [share.url.locators]
  );

  const createIndexLinkProps = useMemo(() => {
    if (createIndexLocator) {
      return {
        href: createIndexLocator.getRedirectUrl({}),
        onClick: async (event: React.MouseEvent<HTMLAnchorElement>) => {
          event.preventDefault();
          const url = await createIndexLocator.getUrl({});
          application?.navigateToUrl(url);
        },
      };
    }
    return null;
  }, [application, createIndexLocator]);

  return createIndexLocator && createIndexLinkProps ? (
    <EuiButton
      color="primary"
      iconType="plusInCircle"
      fill
      data-test-subj="createIndexButton"
      {...createIndexLinkProps}
    >
      <FormattedMessage
        id="xpack.searchPlayground.createIndexButton"
        defaultMessage="Create an index"
      />
    </EuiButton>
  ) : (
    <EuiCallOut
      title={i18n.translate('xpack.searchPlayground.createIndexCallout', {
        defaultMessage: 'You need to create an index first',
      })}
      size="s"
      color="warning"
      data-test-subj="createIndexCallout"
    />
  );
};
