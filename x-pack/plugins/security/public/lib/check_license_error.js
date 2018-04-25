/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { XPackInfoProvider } from 'plugins/xpack_main/services/xpack_info';
import { Notifier } from 'ui/notify';

export function checkLicenseError(kbnUrl, Promise, Private) {
  const xpackInfo = Private(XPackInfoProvider);
  const genericNotifier = new Notifier({ location: 'Security' });

  return err => {
    if (!xpackInfo.get('features.security.showLinks')) {
      genericNotifier.error(xpackInfo.get('features.security.linksMessage'));
      kbnUrl.redirect('/management');
      return Promise.halt();
    }
    return Promise.reject(err);
  };
}
