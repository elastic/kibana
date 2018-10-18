/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { templateFromReactComponent } from '../../../public/lib/template_from_react_component';

const DemodataDatasource = () => (
  <EuiText>
    <h3>
      <FormattedMessage
        id="xpack.canvas.uis.datasource.demodata.demodataTitle"
        defaultMessage="You are using demo data"
      />
    </h3>
    <p>
      <FormattedMessage
        id="xpack.canvas.uis.datasource.demodata.demodataDescription"
        defaultMessage="This data source is connected to every Canvas element by default. Its purpose is to give you
        some playground data to get started. The demo set contains 4 strings, 3 numbers and a date.
        Feel free to experiment and, when you're ready, click {changeDatasource} link
        below to connect to your own data.You are using demo data"
        values={{
          changeDatasource: (
            <strong>
              <FormattedMessage
                id="xpack.canvas.uis.datasource.demodata.demodataDescription.changeYourDatasourceFragmentText"
                defaultMessage="Change your data source"
              />
            </strong>
          ),
        }}
      />
    </p>
  </EuiText>
);

export const demodata = () => ({
  name: 'demodata',
  displayName: i18n.translate('xpack.canvas.uis.datasource.demodataDisplayName', {
    defaultMessage: 'Demo data',
  }),
  help: i18n.translate('xpack.canvas.uis.datasource.demodataHelpText', {
    defaultMessage: 'Mock data set with usernames, prices, projects, countries, and phases',
  }),
  // Replace this with a better icon when we have time.
  image: 'logoElasticStack',
  template: templateFromReactComponent(DemodataDatasource),
});
