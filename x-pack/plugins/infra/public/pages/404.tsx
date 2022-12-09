/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { useLocation } from 'react-router-dom';

const Test = () => {
  const location = useLocation();
  return <div>{location.pathname}</div>;
};
export class NotFoundPage extends React.PureComponent {
  public render() {
    return (
      <div data-test-subj="infraNotFoundPage">
        <Test />
        <FormattedMessage
          id="xpack.infra.notFoundPage.noContentFoundErrorTitle"
          defaultMessage="No content found"
        />
      </div>
    );
  }
}
