/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { CoreStart, IBasePath } from 'src/core/public';

interface Props {
  basePath: IBasePath;
}

export function ResetSessionPage({ basePath }: Props) {
  return (
    <EuiPage style={{ minHeight: '100vh' }}>
      <EuiPageBody>
        <EuiPageContent verticalPosition="center" horizontalPosition="center">
          <EuiEmptyPrompt
            iconType="alert"
            iconColor="danger"
            title={
              <h2>
                <FormattedMessage
                  id="xpack.security.resetSession.title"
                  defaultMessage="You do not have permission to access the requested page"
                />
              </h2>
            }
            body={
              <p>
                <FormattedMessage
                  id="xpack.security.resetSession.description"
                  defaultMessage="Either go back to the previous page or log in as a different user."
                />
              </p>
            }
            actions={[
              <EuiButton
                color="primary"
                fill
                href={basePath.prepend('/api/security/logout') + window.location.search}
                data-test-subj="ResetSessionButton"
              >
                <FormattedMessage
                  id="xpack.security.resetSession.LogOutButtonLabel"
                  defaultMessage="Log in as different user"
                />
              </EuiButton>,
              <EuiButtonEmpty onClick={onClickGoBack}>
                <FormattedMessage
                  id="xpack.security.resetSession.goBackButtonLabel"
                  defaultMessage="Go back"
                />
              </EuiButtonEmpty>,
            ]}
          />
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );

  function onClickGoBack(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    window.history.back();
  }
}

export function renderResetSessionPage(
  i18nStart: CoreStart['i18n'],
  element: Element,
  props: Props
) {
  ReactDOM.render(
    <i18nStart.Context>
      <ResetSessionPage {...props} />
    </i18nStart.Context>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
}
