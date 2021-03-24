/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React from 'react';
import ReactDOM from 'react-dom';

import { FormattedMessage } from '@kbn/i18n/react';
import type { CoreStart, IBasePath } from 'src/core/public';

import { parseNext } from '../../../common/parse_next';
import { AuthenticationStatePage } from '../components';

interface Props {
  basePath: IBasePath;
}

export function UnauthorizedPage({ basePath }: Props) {
  return (
    <AuthenticationStatePage
      title={
        <FormattedMessage
          id="xpack.security.unauthorized.title"
          defaultMessage="You could not log in. Please try again."
        />
      }
    >
      <EuiButton href={parseNext(window.location.href, basePath.serverBasePath)}>
        <FormattedMessage id="xpack.security.unauthorized.login" defaultMessage="Log in" />
      </EuiButton>
    </AuthenticationStatePage>
  );
}

export function renderUnauthorizedPage(
  i18nStart: CoreStart['i18n'],
  element: Element,
  props: Props
) {
  ReactDOM.render(
    <i18nStart.Context>
      <UnauthorizedPage {...props} />
    </i18nStart.Context>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
}
