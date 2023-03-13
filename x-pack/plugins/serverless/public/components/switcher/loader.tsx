/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { Logo, type Props } from './logo';

export const Loader = (props: Props) => (
  <div className="kbnWelcomeView" id="kbn_loading_message" data-test-subj="kbnLoadingMessage">
    <div className="kbnLoaderWrap">
      <Logo {...props} />
      <div className="kbnWelcomeText">
        {i18n.translate('core.ui.welcomeMessage', {
          defaultMessage: 'Loading Project',
        })}
      </div>
      <div className="kbnProgress" />
    </div>
  </div>
);
